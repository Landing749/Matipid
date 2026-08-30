import { corsHeaders, handleOptions, jsonError } from './cors'
import { buildTablePdf } from './pdf'
import { getAuditRecords, getTransactions, parseFilters } from './rtdb'
import { buildXlsx } from './sheet'
import type { Env } from './types'

const PHP = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 })

function bearerToken(req: Request): string | null {
  const h = req.headers.get('Authorization') ?? ''
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m ? m[1] : null
}

function filename(base: string, format: string) {
  const stamp = new Date().toISOString().slice(0, 10)
  return `${base}-${stamp}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
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
