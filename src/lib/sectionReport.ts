import QRCode from 'qrcode'
import { auth, dbGet, logActivity } from '@/lib/firebase'
import { fetchReportSourceData } from '@/lib/reportData'
import { registerReportVersion, buildVerifyUrl } from '@/lib/reportVerification'
import { buildSectionReportPdf, type ReportStat, type ReportTable, type SignatoryLine } from '@/lib/clientPdfReport'
import { formatCurrencyForPdf } from '@/lib/utils'
import logoMarkUrl from '@/assets/logo-mark.png'

// Matches the Worker's env.SECTION_NAME branding.
const SECTION_NAME = 'MATIPID'
const REPORT_KIND = 'section-report'

export const REAL_REPORT_STEPS = [
  'Fetching events, finances, and settings\u2026',
  'Sealing the report with a verification code\u2026',
  'Rendering pages\u2026',
]
export const SAMPLE_REPORT_STEPS = ['Loading sample data\u2026', 'Rendering pages\u2026']

interface ReportSections {
  reportTitle: string
  periodLabel: string
  preparedBy?: string
  stats: ReportStat[]
  tables: ReportTable[]
  photo?: { dataUrl?: string; caption?: string; credit?: string }
  signatories: SignatoryLine[]
  eventsCount: number
  totalAttendance: number
  totalIncome: number
  totalExpense: number
}

async function loadImageAsDataUrl(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url)
    if (!res.ok) return undefined
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Could not read image'))
      reader.readAsDataURL(blob)
    })
  } catch {
    return undefined
  }
}

function fmtSigned(amount: number, negative: boolean) {
  return (negative ? '-' : '+') + formatCurrencyForPdf(Math.abs(amount))
}

async function buildLiveSections(): Promise<ReportSections> {
  if (!auth.currentUser) throw new Error('Sign in required to export this.')
  const { transactions, events, rsvps, photoOfTheYear, signatories } = await fetchReportSourceData()

  const attendeesFor = (id: string) => rsvps[id]?.count ?? 0
  const totalAttendance = events.reduce((s, e) => s + attendeesFor(e.id), 0)
  const approved = transactions.filter((t) => t.status === 'approved')
  const totalIncome = approved.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = approved.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net = totalIncome - totalExpense

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
      e.location || '\u2014',
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
          `Total Income:  ${formatCurrencyForPdf(totalIncome)}`,
          `Total Expense: ${formatCurrencyForPdf(totalExpense)}`,
          `Net Balance:   ${formatCurrencyForPdf(net)}`,
        ]
      : undefined,
  }

  const photo = photoOfTheYear
    ? { dataUrl: await loadImageAsDataUrl(photoOfTheYear.imageUrl), caption: photoOfTheYear.caption, credit: photoOfTheYear.credit }
    : undefined

  return {
    reportTitle: 'Section Activity Report',
    periodLabel: 'Period: All recorded activity',
    preparedBy: auth.currentUser.email ?? undefined,
    stats: [
      { label: 'Events Recorded', value: String(events.length) },
      { label: 'Total Attendance', value: String(totalAttendance) },
      { label: 'Total Income', value: formatCurrencyForPdf(totalIncome), tone: 'income' },
      { label: 'Total Expenses', value: formatCurrencyForPdf(totalExpense), tone: 'expense' },
      { label: 'Net Balance', value: formatCurrencyForPdf(net), tone: 'net' },
    ],
    tables: [eventsTable, financeTable],
    photo,
    signatories: [
      { role: 'Auditor', name: signatories.auditorName },
      { role: 'Treasurer', name: signatories.treasurerName },
      { role: 'Class Adviser', name: signatories.adviserName },
    ],
    eventsCount: events.length,
    totalAttendance,
    totalIncome,
    totalExpense,
  }
}

function buildSampleSections(): ReportSections {
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
    footerLines: [`Total Income:  ${formatCurrencyForPdf(2000)}`, `Total Expense: ${formatCurrencyForPdf(850)}`, `Net Balance:   ${formatCurrencyForPdf(1150)}`],
  }

  return {
    reportTitle: 'Section Activity Report (SAMPLE)',
    periodLabel: 'Sample data \u2014 not from live records',
    preparedBy: 'Sample',
    stats: [
      { label: 'Events Recorded', value: '3' },
      { label: 'Total Attendance', value: '119' },
      { label: 'Total Income', value: formatCurrencyForPdf(2000), tone: 'income' },
      { label: 'Total Expenses', value: formatCurrencyForPdf(850), tone: 'expense' },
      { label: 'Net Balance', value: formatCurrencyForPdf(1150), tone: 'net' },
    ],
    tables: [eventsTable, financeTable],
    photo: { caption: 'Sample caption goes here', credit: 'Sample credit line' },
    signatories: [
      { role: 'Auditor', name: 'Sample' },
      { role: 'Treasurer', name: 'Sample' },
      { role: 'Class Adviser', name: 'Sample' },
    ],
    eventsCount: 3,
    totalAttendance: 119,
    totalIncome: 2000,
    totalExpense: 850,
  }
}

function triggerDownload(bytes: Uint8Array, filename: string) {
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Full client-side pipeline for the Section Report: gather data, register
 * a verification record (real exports only), render with jsPDF, and
 * download. Runs entirely in the browser — no Worker call, so it works on
 * mobile the same as desktop.
 */
export async function generateSectionReport(opts: { sample: boolean; onStep: (index: number) => void }): Promise<void> {
  const { sample, onStep } = opts
  const generatedAt = Date.now()

  onStep(0)
  const data = sample ? buildSampleSections() : await buildLiveSections()

  let security: { shortCode: string; qrDataUrl: string } | undefined
  if (!sample) {
    onStep(1)
    const { reportId, shortCode } = await registerReportVersion({
      kind: REPORT_KIND,
      sectionName: SECTION_NAME,
      reportTitle: data.reportTitle,
      periodLabel: data.periodLabel,
      preparedByEmail: data.preparedBy,
      generatedAt,
      eventsCount: data.eventsCount,
      totalAttendance: data.totalAttendance,
      totalIncome: data.totalIncome,
      totalExpense: data.totalExpense,
      tables: data.tables.map((t) => ({ title: t.title, rows: t.rows })),
    })
    const qrDataUrl = await QRCode.toDataURL(buildVerifyUrl(reportId, shortCode), { margin: 1, width: 240 })
    security = { shortCode, qrDataUrl }

    // Internal accountability trail — independent of the public
    // verification record, so admins can see who sealed which report and
    // when, even though "reportVerifications" itself can no longer be
    // edited after creation (see firebase-rtdb-rules.json).
    const uid = auth.currentUser?.uid
    const email = auth.currentUser?.email
    if (uid && email) {
      const officerProfile = await dbGet<{ role?: string }>(`users/${uid}`).catch(() => null)
      await logActivity({
        userUid: uid,
        userEmail: email,
        role: officerProfile?.role || 'officer',
        action: 'GENERATE_SECTION_REPORT',
        targetResource: 'reportVerifications',
        targetId: reportId,
        details: `shortCode=${shortCode} events=${data.eventsCount} income=${data.totalIncome} expense=${data.totalExpense}`,
      }).catch(() => {
        // Best-effort — never block a report export over a logging failure.
      })
    }
  }

  onStep(sample ? 1 : 2)
  const logoDataUrl = await loadImageAsDataUrl(logoMarkUrl)
  const bytes = await buildSectionReportPdf({
    sectionName: SECTION_NAME,
    reportTitle: data.reportTitle,
    periodLabel: data.periodLabel,
    preparedBy: data.preparedBy,
    generatedAt,
    logoDataUrl,
    stats: data.stats,
    tables: data.tables,
    photoOfTheYear: data.photo,
    signatories: data.signatories,
    security,
  })

  const base = sample ? 'matipid-section-report-sample' : 'matipid-section-report'
  triggerDownload(bytes, `${base}-${new Date(generatedAt).toISOString().slice(0, 10)}.pdf`)
}
