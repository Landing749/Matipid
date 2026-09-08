import { corsHeaders, handleOptions, jsonError } from './cors'
import { buildTablePdf } from './pdf'
import { renderPdfFromHtml } from './pdfRender'
import { buildSectionReportHtml, fmtSigned, type PhotoOfTheYear, type ReportTable, type SignatoryLine } from './reportHtml'
import { getAuditRecords, getEvents, getPhotoOfTheYear, getReportSignatories, getRsvps, getTransactions, parseFilters } from './rtdb'
import { buildXlsx } from './sheet'
import type { Env, ReportSignatoriesSetting } from './types'
import { PublishScheduler } from './publishScheduler'

export { PublishScheduler }

// Manual formatter, not Intl's `currency` style — see the matching comment
// in reportHtml.ts. `currencyDisplay: 'code'` doesn't reliably hold in the
// Workers runtime, it falls back to the "₱" glyph, which the PDF font
// doesn't cover — that's what was producing the "±" and the garbled/
// overlapping table text in the exported PDF. Plain ASCII avoids both.
// (The xlsx export is unaffected — Excel doesn't need font glyph coverage.)
const PHP = { format: (n: number) => 'PHP ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function bearerToken(req: Request): string | null {
  const h = req.headers.get('Authorization') ?? ''
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m ? m[1] : null
}

function filename(base: string, format: string) {
  const stamp = new Date().toISOString().slice(0, 10)
  return `${base}-${stamp}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
}

/**
 * Firebase ID tokens are JWTs; the `email` claim is just for display on the
 * report's cover ("Prepared by ..."), so a lightweight unverified decode is
 * fine here — requireOfficer() already proved this token is a live signed-in
 * session via the RTDB round-trip before this is ever called.
 */
function decodeIdTokenEmail(idToken: string): string | undefined {
  try {
    const payload = idToken.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const claims = JSON.parse(atob(padded)) as { email?: string }
    return claims.email
  } catch {
    return undefined
  }
}

/**
 * Verifies the caller holds a valid Firebase ID token for a currently
 * signed-in user — the same trick the audit export uses: forward it to an
 * `auth != null`-gated RTDB node (`logs`) and let Firebase's own token
 * validation decide, rather than re-implementing that check with the
 * Admin SDK. Only officers ever sign in on this app, so this is
 * equivalent to "an officer asked for this," without needing to look up
 * roles here. Returns an error Response if invalid, or null if OK.
 */
async function requireOfficer(req: Request, env: Env): Promise<{ idToken: string } | Response> {
  const idToken = bearerToken(req)
  if (!idToken) return jsonError(req, env, 'Missing bearer token', 401)

  const check = await fetch(
    `${env.FIREBASE_DB_URL}/logs.json?auth=${encodeURIComponent(idToken)}&shallow=true`
  )
  if (!check.ok) return jsonError(req, env, 'Invalid or expired session', 401)

  return { idToken }
}

/**
 * Fires the GitHub Actions rebuild via repository_dispatch. Shared by the
 * immediate trigger-deploy endpoint and the PublishScheduler alarm, so
 * both paths dispatch the exact same event.
 */
async function dispatchRebuild(env: Env): Promise<Response> {
  return fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'matipid-export-worker',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event_type: 'content-updated' }),
  })
}

/**
 * Kicks off the deploy workflow immediately, so a new/edited/deleted
 * announcement or event gets a real OG preview without waiting for the
 * next code push.
 */
async function handleTriggerDeploy(req: Request, env: Env): Promise<Response> {
  const auth = await requireOfficer(req, env)
  if (auth instanceof Response) return auth

  const dispatch = await dispatchRebuild(env)
  if (!dispatch.ok) {
    return jsonError(req, env, `GitHub dispatch failed: ${dispatch.status} ${await dispatch.text()}`, 502)
  }

  return new Response(JSON.stringify({ triggered: true }), {
    status: 202,
    headers: { ...corsHeaders(req, env), 'Content-Type': 'application/json' },
  })
}

/**
 * Schedules (or reschedules) a one-shot rebuild for the moment a specific
 * announcement's `publishAt` arrives — see publishScheduler.ts for why
 * this exists instead of a periodic checker. Body: { id, publishAt }.
 */
async function handleSchedulePublish(req: Request, env: Env): Promise<Response> {
  const auth = await requireOfficer(req, env)
  if (auth instanceof Response) return auth

  const body = await req.json().catch(() => null) as { id?: string; publishAt?: number } | null
  if (!body?.id || typeof body.publishAt !== 'number') {
    return jsonError(req, env, 'Body must be { id: string, publishAt: number }', 400)
  }

  const stub = env.PUBLISH_SCHEDULER.get(env.PUBLISH_SCHEDULER.idFromName(body.id))
  await stub.schedule(body.publishAt)

  return new Response(JSON.stringify({ scheduled: true, publishAt: body.publishAt }), {
    status: 202,
    headers: { ...corsHeaders(req, env), 'Content-Type': 'application/json' },
  })
}

/**
 * Cancels a pending scheduled rebuild for one announcement — used when an
 * officer deletes it, unpublishes it, or edits it back to draft before
 * `publishAt` arrives. Body: { id }.
 */
async function handleCancelSchedule(req: Request, env: Env): Promise<Response> {
  const auth = await requireOfficer(req, env)
  if (auth instanceof Response) return auth

  const body = await req.json().catch(() => null) as { id?: string } | null
  if (!body?.id) return jsonError(req, env, 'Body must be { id: string }', 400)

  const stub = env.PUBLISH_SCHEDULER.get(env.PUBLISH_SCHEDULER.idFromName(body.id))
  await stub.cancel()

  return new Response(JSON.stringify({ cancelled: true }), {
    status: 202,
    headers: { ...corsHeaders(req, env), 'Content-Type': 'application/json' },
  })
}

async function handleFinanceExport(req: Request, env: Env, url: URL): Promise<Response> {
  const format = (url.searchParams.get('format') ?? 'pdf').toLowerCase()
  const filters = parseFilters(url)
  const idToken = bearerToken(req) ?? undefined // transactions are public-read, token optional
  const rows = await getTransactions(env, filters, idToken)

  const totalIncome = rows.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const totalExpense = rows.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0)

  const subtitleParts = [`${rows.length} record${rows.length === 1 ? '' : 's'}`]
  if (filters.status !== 'all') subtitleParts.push(`status: ${filters.status}`)
  if (filters.type !== 'all') subtitleParts.push(`type: ${filters.type}`)
  const subtitle = subtitleParts.join(' · ')

  if (format === 'xlsx') {
    const header = ['Date', 'Type', 'Title', 'Category', 'Amount (PHP)', 'Status', 'Recorded By']
    const data = rows.map((t) => [
      new Date(t.createdAt).toISOString().slice(0, 10),
      t.type,
      t.title,
      t.category,
      t.type === 'expense' ? -t.amount : t.amount,
      t.status,
      t.createdByEmail ?? '',
    ])
    data.push([])
    data.push(['', '', '', 'Total Income', totalIncome, '', ''])
    data.push(['', '', '', 'Total Expense', -totalExpense, '', ''])
    data.push(['', '', '', 'Net', totalIncome - totalExpense, '', ''])

    const bytes = buildXlsx('Finance', header, data)
    return new Response(bytes, {
      headers: {
        ...corsHeaders(req, env),
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename('matipid-finance', 'xlsx')}"`,
      },
    })
  }

  const bytes = await buildTablePdf({
    sectionName: env.SECTION_NAME,
    reportTitle: 'Financial Report',
    subtitle,
    generatedAt: Date.now(),
    columns: [
      { header: 'Date', width: 70 },
      { header: 'Type', width: 60 },
      { header: 'Title', width: 220 },
      { header: 'Category', width: 130 },
      { header: 'Amount', width: 100, align: 'right' },
      { header: 'Status', width: 90 },
      { header: 'Recorded By', width: 90 },
    ],
    rows: rows.map((t) => [
      new Date(t.createdAt).toISOString().slice(0, 10),
      t.type,
      t.title,
      t.category,
      (t.type === 'expense' ? '-' : '+') + PHP.format(t.amount),
      t.status,
      t.createdByEmail ?? '',
    ]),
    summaryLines: [
      `Total Income:  ${PHP.format(totalIncome)}`,
      `Total Expense: ${PHP.format(totalExpense)}`,
      `Net:           ${PHP.format(totalIncome - totalExpense)}`,
    ],
  })

  return new Response(bytes, {
    headers: {
      ...corsHeaders(req, env),
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename('matipid-finance', 'pdf')}"`,
    },
  })
}

/**
 * Downloads whatever the officer set as `settings/photoOfTheYear` and
 * hands back raw bytes + type ready for pdf-lib. Best-effort: any failure
 * (deleted image, bad URL, unsupported format) just drops the closing
 * photo page instead of failing the whole report — a broken photo link
 * shouldn't block an officer from getting their finance/events report.
 */
async function fetchPhotoOfTheYear(env: Env): Promise<PhotoOfTheYear | undefined> {
  const setting = await getPhotoOfTheYear(env).catch(() => null)
  if (!setting) return undefined

  try {
    const res = await fetch(setting.imageUrl)
    if (!res.ok) return undefined
    const contentType = res.headers.get('content-type') ?? ''
    const imageType = contentType.includes('png') || setting.imageUrl.toLowerCase().endsWith('.png') ? 'png' : 'jpg'
    const imageBytes = new Uint8Array(await res.arrayBuffer())
    return { imageBytes, imageType, caption: setting.caption, credit: setting.credit }
  } catch {
    return undefined
  }
}

/**
 * Builds the three MATIPID signatory lines (Auditor, Treasurer, Class
 * Adviser) from `settings/reportSignatories` in the RTDB. A blank/missing
 * name still gets a line + role label — the officer signs by hand.
 */
function buildSignatories(setting: ReportSignatoriesSetting): SignatoryLine[] {
  return [
    { role: 'Auditor', name: setting.auditorName },
    { role: 'Treasurer', name: setting.treasurerName },
    { role: 'Class Adviser', name: setting.adviserName },
  ]
}

/**
 * "Download Sample" — same branded layout as the real Section Report,
 * but built entirely from fixed placeholder data instead of live RTDB
 * reads. Lets an officer see exactly what the template (including the
 * closing photo page and signature page) looks like before real events,
 * finance records, a photo, or signatory names are ever set. Every name
 * that would otherwise come from live config just reads "Sample" so it's
 * unmistakably not a real document.
 */
async function buildSampleReportResponse(req: Request, env: Env): Promise<Response> {
  const eventsTable: ReportTable = {
    title: 'Events & Attendance',
    columns: [
      { header: 'Date', width: 68 },
      { header: 'Event', width: 195 },
      { header: 'Location', width: 130 },
      { header: 'Attendees', width: 114, align: 'right' },
    ],
    rows: [
      ['2026-06-15', 'Sample Event One', 'Sample Location', '38'],
      ['2026-07-04', 'Sample Event Two', 'Sample Location', '41'],
      ['2026-08-20', 'Sample Event Three', 'Sample Location', '40'],
    ],
    emptyMessage: 'No events recorded for this period.',
    footerLines: ['Total attendance across 3 events: 119'],
  }

  const financeTable: ReportTable = {
    title: 'Financial Records',
    columns: [
      { header: 'Date', width: 65 },
      { header: 'Type', width: 52 },
      { header: 'Title', width: 158 },
      { header: 'Category', width: 100 },
      { header: 'Amount', width: 78, align: 'right' },
      { header: 'Status', width: 54 },
    ],
    rows: [
      ['2026-06-01', 'income', 'Sample Income Entry', 'Membership', fmtSigned(2000, false), 'approved'],
      ['2026-06-18', 'expense', 'Sample Expense Entry', 'Supplies', fmtSigned(850, true), 'approved'],
      ['2026-07-22', 'expense', 'Sample Pending Entry', 'Supplies', fmtSigned(1150, true), 'pending'],
    ],
    rowTones: ['approved', 'approved', 'pending'],
    statusColumnIndex: 5,
    caption: 'Pending, flagged, and rejected transactions are listed for transparency but excluded from the totals below.',
    emptyMessage: 'No financial records for this period.',
    footerLines: [`Total Income:  ${PHP.format(2000)}`, `Total Expense: ${PHP.format(850)}`, `Net Balance:   ${PHP.format(1150)}`],
  }

  const generatedAt = Date.now()
  const reportTitle = 'Section Activity Report (SAMPLE)'
  const html = buildSectionReportHtml({
    sectionName: env.SECTION_NAME,
    reportTitle,
    periodLabel: 'Sample data — not from live records',
    preparedBy: 'Sample',
    generatedAt,
    stats: [
      { label: 'Events Recorded', value: '3' },
      { label: 'Total Attendance', value: '119' },
      { label: 'Total Income', value: PHP.format(2000), tone: 'income' },
      { label: 'Total Expenses', value: PHP.format(850), tone: 'expense' },
      { label: 'Net Balance', value: PHP.format(1150), tone: 'net' },
    ],
    tables: [eventsTable, financeTable],
    photoOfTheYear: { caption: 'Sample caption goes here', credit: 'Sample credit line' },
    signatories: [
      { role: 'Auditor', name: 'Sample' },
      { role: 'Treasurer', name: 'Sample' },
      { role: 'Class Adviser', name: 'Sample' },
    ],
  })
  const bytes = await renderPdfFromHtml(env, html, { sectionName: env.SECTION_NAME, reportTitle, generatedAt })

  return new Response(bytes, {
    headers: {
      ...corsHeaders(req, env),
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename('matipid-section-report-sample', 'pdf')}"`,
    },
  })
}

/**
 * Officer-only "Section Report" — a single branded A4 PDF combining events
 * (with RSVP attendance) and finance records into one presentation-ready
 * document, the way an officer would hand it to advisers or during
 * turnover. Unlike the plain Finance export, overview totals only count
 * `approved` transactions (matching what the Dashboard shows as the real
 * balance); the finance table itself still lists every status so pending
 * items are visible, just clearly labelled.
 */
async function handleReportExport(req: Request, env: Env, url: URL): Promise<Response> {
  const auth = await requireOfficer(req, env)
  if (auth instanceof Response) return auth

  if (url.searchParams.get('sample') === '1') {
    return buildSampleReportResponse(req, env)
  }

  const filters = parseFilters(url)
  const [transactions, events, rsvps, photoOfTheYear, signatorySetting] = await Promise.all([
    getTransactions(env, filters, auth.idToken),
    getEvents(env, filters, auth.idToken),
    getRsvps(env, auth.idToken),
    fetchPhotoOfTheYear(env),
    getReportSignatories(env),
  ])

  const attendeesFor = (eventId: string) => rsvps[eventId]?.count ?? 0
  const totalAttendance = events.reduce((s, e) => s + attendeesFor(e.id), 0)

  const approved = transactions.filter((t) => t.status === 'approved')
  const totalIncome = approved.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = approved.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net = totalIncome - totalExpense

  const periodLabel =
    filters.from || filters.to
      ? `Period: ${filters.from ? new Date(filters.from).toISOString().slice(0, 10) : 'earliest record'} – ${filters.to ? new Date(filters.to).toISOString().slice(0, 10) : 'now'}`
      : 'Period: All recorded activity'

  const eventsTable: ReportTable = {
    title: 'Events & Attendance',
    columns: [
      { header: 'Date', width: 68 },
      { header: 'Event', width: 195 },
      { header: 'Location', width: 130 },
      { header: 'Attendees', width: 114, align: 'right' },
    ],
    rows: events.map((e) => [
      new Date(e.date).toISOString().slice(0, 10),
      e.title,
      e.location || '—',
      String(attendeesFor(e.id)),
    ]),
    emptyMessage: 'No events recorded for this period.',
    footerLines: events.length
      ? [`Total attendance across ${events.length} event${events.length === 1 ? '' : 's'}: ${totalAttendance}`]
      : undefined,
  }

  const hasNonApproved = transactions.some((t) => t.status !== 'approved')
  const financeTable: ReportTable = {
    title: 'Financial Records',
    columns: [
      { header: 'Date', width: 65 },
      { header: 'Type', width: 52 },
      { header: 'Title', width: 158 },
      { header: 'Category', width: 100 },
      { header: 'Amount', width: 78, align: 'right' },
      { header: 'Status', width: 54 },
    ],
    rows: transactions.map((t) => [
      new Date(t.createdAt).toISOString().slice(0, 10),
      t.type,
      t.title,
      t.category,
      fmtSigned(t.amount, t.type === 'expense'),
      t.status,
    ]),
    rowTones: transactions.map((t) => t.status),
    statusColumnIndex: 5,
    caption: hasNonApproved
      ? 'Pending, flagged, and rejected transactions are listed for transparency but excluded from the totals below.'
      : undefined,
    emptyMessage: 'No financial records for this period.',
    footerLines: transactions.length
      ? [
          `Total Income:  ${PHP.format(totalIncome)}`,
          `Total Expense: ${PHP.format(totalExpense)}`,
          `Net Balance:   ${PHP.format(net)}`,
        ]
      : undefined,
  }

  const generatedAt = Date.now()
  const reportTitle = 'Section Activity Report'
  const html = buildSectionReportHtml({
    sectionName: env.SECTION_NAME,
    reportTitle,
    periodLabel,
    preparedBy: decodeIdTokenEmail(auth.idToken),
    generatedAt,
    stats: [
      { label: 'Events Recorded', value: String(events.length) },
      { label: 'Total Attendance', value: String(totalAttendance) },
      { label: 'Total Income', value: PHP.format(totalIncome), tone: 'income' },
      { label: 'Total Expenses', value: PHP.format(totalExpense), tone: 'expense' },
      { label: 'Net Balance', value: PHP.format(net), tone: 'net' },
    ],
    tables: [eventsTable, financeTable],
    photoOfTheYear,
    signatories: buildSignatories(signatorySetting),
  })
  const bytes = await renderPdfFromHtml(env, html, { sectionName: env.SECTION_NAME, reportTitle, generatedAt })

  return new Response(bytes, {
    headers: {
      ...corsHeaders(req, env),
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename('matipid-section-report', 'pdf')}"`,
    },
  })
}

async function handleAuditExport(req: Request, env: Env, url: URL): Promise<Response> {
  const idToken = bearerToken(req)
  if (!idToken) return jsonError(req, env, 'Sign in required — attach your Firebase ID token as a Bearer token.', 401)

  const format = (url.searchParams.get('format') ?? 'pdf').toLowerCase()
  const filters = parseFilters(url)
  const rows = await getAuditRecords(env, idToken, filters)

  if (format === 'xlsx') {
    const header = ['Date', 'Transaction', 'Action', 'Reviewer', 'Comment']
    const data = rows.map((r) => [
      new Date(r.timestamp).toISOString().slice(0, 16).replace('T', ' '),
      r.txTitle,
      r.action,
      r.reviewerEmail,
      r.comment ?? '',
    ])
    const bytes = buildXlsx('Audit', header, data)
    return new Response(bytes, {
      headers: {
        ...corsHeaders(req, env),
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename('matipid-audit', 'xlsx')}"`,
      },
    })
  }

  const bytes = await buildTablePdf({
    sectionName: env.SECTION_NAME,
    reportTitle: 'Audit Trail',
    subtitle: `${rows.length} record${rows.length === 1 ? '' : 's'}`,
    generatedAt: Date.now(),
    columns: [
      { header: 'Date', width: 110 },
      { header: 'Transaction', width: 260 },
      { header: 'Action', width: 90 },
      { header: 'Reviewer', width: 170 },
      { header: 'Comment', width: 190 },
    ],
    rows: rows.map((r) => [
      new Date(r.timestamp).toISOString().slice(0, 16).replace('T', ' '),
      r.txTitle,
      r.action,
      r.reviewerEmail,
      r.comment ?? '',
    ]),
  })

  return new Response(bytes, {
    headers: {
      ...corsHeaders(req, env),
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename('matipid-audit', 'pdf')}"`,
    },
  })
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return handleOptions(req, env)

    const url = new URL(req.url)

    try {
      if (req.method === 'GET' && url.pathname === '/export/finance') {
        return await handleFinanceExport(req, env, url)
      }
      if (req.method === 'GET' && url.pathname === '/export/audit') {
        return await handleAuditExport(req, env, url)
      }
      if (req.method === 'GET' && url.pathname === '/export/report') {
        return await handleReportExport(req, env, url)
      }
      if (req.method === 'POST' && url.pathname === '/trigger-deploy') {
        return await handleTriggerDeploy(req, env)
      }
      if (req.method === 'POST' && url.pathname === '/schedule-publish') {
        return await handleSchedulePublish(req, env)
      }
      if (req.method === 'POST' && url.pathname === '/cancel-schedule') {
        return await handleCancelSchedule(req, env)
      }
      if (url.pathname === '/' || url.pathname === '/health') {
        return new Response(JSON.stringify({ ok: true, service: 'matipid-export' }), {
          headers: { ...corsHeaders(req, env), 'Content-Type': 'application/json' },
        })
      }
      return jsonError(req, env, 'Not found', 404)
    } catch (err) {
      return jsonError(req, env, err instanceof Error ? err.message : 'Internal error', 500)
    }
  },
}
