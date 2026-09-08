import { dbGet } from '@/lib/firebase'

export interface ReportTransaction {
  id: string
  type: 'income' | 'expense'
  title: string
  category: string
  amount: number
  status: string
  createdAt: number
}

export interface ReportEvent {
  id: string
  title: string
  date: number
  location?: string
}

export interface ReportRsvpNode {
  count?: number
}

export interface ReportPhotoOfTheYearSetting {
  imageUrl: string
  caption?: string
  credit?: string
}

export interface ReportSignatoriesSetting {
  auditorName?: string
  treasurerName?: string
  adviserName?: string
}

/**
 * Reads everything the Section Report needs directly from RTDB — the same
 * nodes worker/src/rtdb.ts reads server-side, fetched here with the
 * already-signed-in officer's own client session instead. `transactions`
 * and `audit_records` aside, these are all public-read nodes anyway.
 */
export async function fetchReportSourceData() {
  const [transactionsRaw, eventsRaw, rsvpsRaw, photoOfTheYear, signatories] = await Promise.all([
    dbGet<Record<string, Omit<ReportTransaction, 'id'>>>('transactions'),
    dbGet<Record<string, Omit<ReportEvent, 'id'>>>('events'),
    dbGet<Record<string, ReportRsvpNode>>('rsvps'),
    dbGet<ReportPhotoOfTheYearSetting>('settings/photoOfTheYear'),
    dbGet<ReportSignatoriesSetting>('settings/reportSignatories'),
  ])

  const transactions: ReportTransaction[] = transactionsRaw
    ? Object.entries(transactionsRaw).map(([id, v]) => ({ ...v, id }))
    : []
  const events: ReportEvent[] = eventsRaw ? Object.entries(eventsRaw).map(([id, v]) => ({ ...v, id })) : []

  return {
    transactions: transactions.sort((a, b) => b.createdAt - a.createdAt),
    events: events.sort((a, b) => b.date - a.date),
    rsvps: rsvpsRaw ?? {},
    photoOfTheYear: photoOfTheYear?.imageUrl ? photoOfTheYear : null,
    signatories: signatories ?? {},
  }
}
