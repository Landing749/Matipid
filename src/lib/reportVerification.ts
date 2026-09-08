import { v4 as uuid } from 'uuid'
import { dbGet, dbSet, dbUpdate } from '@/lib/firebase'
import { buildAppUrl } from '@/lib/utils'

/**
 * Report integrity, done entirely client-side against Firebase RTDB — no
 * Worker endpoint. We deliberately don't hash the final PDF's raw bytes:
 * that would be circular (the QR embedded in the PDF would have to encode
 * a hash of a file that isn't finished until the QR is drawn into it), and
 * it's also a poor anti-forgery signal in practice since printing,
 * re-saving, or scanning a PDF changes its bytes without changing its
 * content. Instead we fingerprint the report's *content* — section,
 * title, period, totals, timestamp, and a random report ID — before the
 * PDF is rendered, and print a short verification code on the document
 * itself that has to match what's on record.
 *
 * Anti-forgery properties this gives us:
 *  - `reportId` is a random UUID (unguessable), not sequential.
 *  - `shortCode` is a short hash slice printed on the PDF; the QR link
 *    carries it too, so a copied/typed URL with the wrong code is caught.
 *  - Only signed-in officers can write here (RTDB rule), so a random
 *    visitor can't fabricate a "verified" record even if they guess an ID.
 *  - Generating a new report automatically marks the previous one for the
 *    same `kind` as obsolete, so an old (genuine) report visibly reads as
 *    outdated instead of silently passing as current.
 */

export interface ReportVerificationRecord {
  reportId: string
  kind: string
  sectionName: string
  reportTitle: string
  periodLabel: string
  preparedByEmail?: string
  generatedAt: number
  hash: string
  shortCode: string
  status: 'current' | 'obsolete'
  supersedes?: string
  supersededBy?: string
}

export interface ReportFingerprintInput {
  kind: string
  sectionName: string
  reportTitle: string
  periodLabel: string
  preparedByEmail?: string
  generatedAt: number
  eventsCount: number
  totalAttendance: number
  totalIncome: number
  totalExpense: number
  /**
   * The exact table content printed in the PDF (title + every rendered
   * row, per table). Without this, the fingerprint only bound the
   * *aggregate* counts/totals — two reports with completely different
   * individual events or transactions could share the same totals and
   * therefore the same verification code. Hashing the full row content
   * closes that gap: any edited, added, removed, or reordered row changes
   * the hash (and so the printed shortCode/QR) even if the totals still
   * happen to match.
   */
  tables: { title: string; rows: string[][] }[]
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Registers a freshly generated report as the new "current" version for
 * its `kind`, and marks whatever was previously current as obsolete. Only
 * ever called for real exports — samples carry no verification record
 * since they aren't real documents.
 */
export async function registerReportVersion(input: ReportFingerprintInput): Promise<{ reportId: string; shortCode: string }> {
  const reportId = uuid()
  // `tables` (the full row content) only ever goes into this hash input —
  // it's deliberately left out of the `record` written below, so the
  // public verification record stays a small pointer/fingerprint, not a
  // duplicate copy of the section's financial and event data.
  const payload = JSON.stringify({ ...input, reportId })
  const hash = await sha256Hex(payload)
  const shortCode = hash.slice(0, 8).toUpperCase()

  const latestPath = `reportVerifications/_latest/${input.kind}`
  const previousId = await dbGet<string>(latestPath)

  const record: ReportVerificationRecord = {
    reportId,
    kind: input.kind,
    sectionName: input.sectionName,
    reportTitle: input.reportTitle,
    periodLabel: input.periodLabel,
    preparedByEmail: input.preparedByEmail,
    generatedAt: input.generatedAt,
    hash,
    shortCode,
    status: 'current',
    supersedes: previousId ?? undefined,
  }

  await dbSet(`reportVerifications/${reportId}`, record)
  await dbSet(latestPath, reportId)
  if (previousId) {
    await dbUpdate(`reportVerifications/${previousId}`, { status: 'obsolete', supersededBy: reportId })
  }

  return { reportId, shortCode }
}

export async function getReportVerification(reportId: string): Promise<ReportVerificationRecord | null> {
  return dbGet<ReportVerificationRecord>(`reportVerifications/${reportId}`)
}

/** Builds the QR/share URL — carries the short code so an altered link is detectable on the verify page. */
export function buildVerifyUrl(reportId: string, shortCode: string): string {
  return buildAppUrl(`verify/${reportId}?c=${shortCode}`)
}
