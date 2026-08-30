import type { AuditRecord, Env, ExportFilters, Transaction } from './types'

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

export async function getAuditRecords(env: Env, idToken: string, filters: ExportFilters): Promise<AuditRecord[]> {
  const raw = await fetchNode<Omit<AuditRecord, 'id'>>(env, 'audit_records', idToken)
  if (!raw) return []

  let list = Object.entries(raw).map(([id, v]) => ({ ...v, id }))
  if (filters.from !== null) list = list.filter((r) => r.timestamp >= filters.from!)
  if (filters.to !== null) list = list.filter((r) => r.timestamp <= filters.to!)

  return list.sort((a, b) => b.timestamp - a.timestamp)
}
