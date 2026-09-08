import type { AuditRecord, Env, EventRecord, ExportFilters, PhotoOfTheYearSetting, ReportSignatoriesSetting, RsvpNode, Transaction } from './types'

/**
 * Fetches a node from the Firebase RTDB REST API. `idToken`, if provided, is
 * forwarded as the `auth` query param so RTDB rules that require
 * `auth != null` (like `audit_records`) resolve correctly — no service
 * account or Admin SDK needed since the DB is intentionally exposed for
 * this kind of read-through access.
 */
async function fetchNode<T>(env: Env, path: string, idToken?: string): Promise<Record<string, T> | null> {
  const url = new URL(`${env.FIREBASE_DB_URL}/${path}.json`)
  if (idToken) url.searchParams.set('auth', idToken)

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`RTDB fetch failed for ${path}: ${res.status} ${await res.text()}`)
  }
  const data = (await res.json()) as Record<string, T> | null
  return data
}

export function parseFilters(url: URL): ExportFilters {
  return {
    status: url.searchParams.get('status') ?? 'all',
    type: url.searchParams.get('type') ?? 'all',
    from: url.searchParams.has('from') ? Number(url.searchParams.get('from')) : null,
    to: url.searchParams.has('to') ? Number(url.searchParams.get('to')) : null,
  }
}

export async function getTransactions(env: Env, filters: ExportFilters, idToken?: string): Promise<Transaction[]> {
  const raw = await fetchNode<Omit<Transaction, 'id'>>(env, 'transactions', idToken)
  if (!raw) return []

  let list = Object.entries(raw).map(([id, v]) => ({ ...v, id }))

  if (filters.status !== 'all') list = list.filter((t) => t.status === filters.status)
  if (filters.type !== 'all') list = list.filter((t) => t.type === filters.type)
  if (filters.from !== null) list = list.filter((t) => t.createdAt >= filters.from!)
  if (filters.to !== null) list = list.filter((t) => t.createdAt <= filters.to!)

  return list.sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * Events, newest first, optionally windowed by `filters.from`/`to` against
 * each event's own `date` field (not `createdAt` — a report for "March"
 * means events happening in March, not events entered into the system
 * then).
 */
export async function getEvents(env: Env, filters: ExportFilters, idToken?: string): Promise<EventRecord[]> {
  const raw = await fetchNode<Omit<EventRecord, 'id'>>(env, 'events', idToken)
  if (!raw) return []

  let list = Object.entries(raw).map(([id, v]) => ({ ...v, id }))
  if (filters.from !== null) list = list.filter((e) => e.date >= filters.from!)
  if (filters.to !== null) list = list.filter((e) => e.date <= filters.to!)

  return list.sort((a, b) => b.date - a.date)
}

/** RSVP node per event id — `{ count, list: { pushId: { name, at } } }`. */
export async function getRsvps(env: Env, idToken?: string): Promise<Record<string, RsvpNode>> {
  const raw = await fetchNode<RsvpNode>(env, 'rsvps', idToken)
  return raw ?? {}
}

/**
 * Reads `settings/photoOfTheYear`, set by an officer picking a photo in
 * the portal (or directly in the RTDB console). Public read, no idToken
 * needed — the report worker only uses it to embed the image, it never
 * writes it. Returns null if nothing has been picked yet, so the report
 * simply skips the closing photo page rather than failing.
 */
export async function getPhotoOfTheYear(env: Env): Promise<PhotoOfTheYearSetting | null> {
  const url = new URL(`${env.FIREBASE_DB_URL}/settings/photoOfTheYear.json`)
  const res = await fetch(url.toString())
  if (!res.ok) return null
  const data = (await res.json()) as PhotoOfTheYearSetting | null
  if (!data?.imageUrl) return null
  return data
}

/**
 * Reads `settings/reportSignatories`, editable in the portal (or directly
 * in the RTDB console) whenever officers change. Public read, same as
 * photoOfTheYear — the report worker only reads it. Missing node or
 * missing fields just fall back to blank signature lines, never an error.
 */
export async function getReportSignatories(env: Env): Promise<ReportSignatoriesSetting> {
  const url = new URL(`${env.FIREBASE_DB_URL}/settings/reportSignatories.json`)
  const res = await fetch(url.toString())
  if (!res.ok) return {}
  const data = (await res.json()) as ReportSignatoriesSetting | null
  return data ?? {}
}

export async function getAuditRecords(env: Env, idToken: string, filters: ExportFilters): Promise<AuditRecord[]> {
  const raw = await fetchNode<Omit<AuditRecord, 'id'>>(env, 'audit_records', idToken)
  if (!raw) return []

  let list = Object.entries(raw).map(([id, v]) => ({ ...v, id }))
  if (filters.from !== null) list = list.filter((r) => r.timestamp >= filters.from!)
  if (filters.to !== null) list = list.filter((r) => r.timestamp <= filters.to!)

  return list.sort((a, b) => b.timestamp - a.timestamp)
}
