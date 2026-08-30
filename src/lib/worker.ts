import { auth } from '@/lib/firebase'

/**
 * Set this to your deployed Worker URL after running `npx wrangler deploy`
 * from /worker (e.g. https://matipid-export.your-subdomain.workers.dev).
 * Left blank until deployed — export buttons show a clear error instead of
 * silently failing.
 */
export const WORKER_URL = ' https://matipid-export.paymongo.workers.dev'

export type ExportKind = 'finance' | 'audit'
export type ExportFormat = 'pdf' | 'xlsx'

export interface ExportFilters {
  status?: string
  type?: string
  from?: number
  to?: number
}

function extFor(format: ExportFormat) {
  return format === 'pdf' ? 'pdf' : 'xlsx'
}

/**
 * Downloads a Finance or Audit export from the Worker. Finance is publicly
 * readable so no token is required; Audit requires the signed-in officer's
 * Firebase ID token (the Worker forwards it to RTDB as `?auth=`).
 */
export async function downloadExport(kind: ExportKind, format: ExportFormat, filters: ExportFilters = {}) {
  if (!WORKER_URL) {
    throw new Error('Export service is not configured yet — set WORKER_URL in src/lib/worker.ts after deploying the Cloudflare Worker.')
  }

  const url = new URL(`${WORKER_URL}/export/${kind}`)
  url.searchParams.set('format', format)
  if (filters.status && filters.status !== 'all') url.searchParams.set('status', filters.status)
  if (filters.type && filters.type !== 'all') url.searchParams.set('type', filters.type)
  if (filters.from) url.searchParams.set('from', String(filters.from))
  if (filters.to) url.searchParams.set('to', String(filters.to))

  const headers: HeadersInit = {}
  if (kind === 'audit') {
    const idToken = await auth.currentUser?.getIdToken()
    if (!idToken) throw new Error('Sign in required to export audit records.')
    headers.Authorization = `Bearer ${idToken}`
  }

  const res = await fetch(url.toString(), { headers })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Export failed (${res.status}): ${body || res.statusText}`)
  }

  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = `matipid-${kind}-${new Date().toISOString().slice(0, 10)}.${extFor(format)}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}
