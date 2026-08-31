import { auth } from '@/lib/firebase'

/**
 * Set this to your deployed Worker URL after running `npx wrangler deploy`
 * from /worker (e.g. https://matipid-export.your-subdomain.workers.dev).
 * Left blank until deployed — export buttons show a clear error instead of
 * silently failing.
 */
export const WORKER_URL = 'https://matipid-export.paymongo.workers.dev'

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

/**
 * Fires a repository_dispatch on the Worker after a content change, so the
 * GitHub Actions deploy runs immediately instead of waiting for the next
 * code push — new/edited/deleted announcements and events get real OG
 * previews within a couple minutes. Requires a signed-in officer session.
 *
 * Deliberately fire-and-forget from call sites: this must never block the
 * save/delete UI flow or surface an error toast over it, since the content
 * change itself already succeeded by the time this runs. Failures here
 * just mean the site rebuilds on the next push or manual trigger instead —
 * not silent data loss.
 */
export async function triggerDeploy() {
  if (!WORKER_URL) return
  const idToken = await auth.currentUser?.getIdToken()
  if (!idToken) return

  try {
    await fetch(`${WORKER_URL}/trigger-deploy`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
    })
  } catch {
    // Network hiccup or Worker down — next push/manual trigger will catch
    // this content up. Not worth surfacing to the officer who just saved.
  }
}

/**
 * Schedules a one-shot rebuild for the moment a scheduled announcement's
 * `publishAt` arrives on its own — no save action happens at that moment,
 * so nothing else would notice. Same fire-and-forget contract as
 * triggerDeploy(): never blocks or surfaces an error over the save UI,
 * since the content change itself already succeeded.
 */
export async function schedulePublish(id: string, publishAt: number) {
  if (!WORKER_URL) return
  const idToken = await auth.currentUser?.getIdToken()
  if (!idToken) return

  try {
    await fetch(`${WORKER_URL}/schedule-publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, publishAt }),
    })
  } catch {
    // Worst case the scheduled rebuild just doesn't fire and the post
    // waits for the next real push, same as before this existed.
  }
}

/**
 * Cancels a pending scheduled rebuild — call whenever an announcement that
 * might have a scheduled alarm outstanding is deleted, unpublished, or
 * edited back to draft/immediate-publish before its old publishAt arrives.
 * Safe to call even if nothing was scheduled.
 */
export async function cancelSchedule(id: string) {
  if (!WORKER_URL) return
  const idToken = await auth.currentUser?.getIdToken()
  if (!idToken) return

  try {
    await fetch(`${WORKER_URL}/cancel-schedule`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  } catch {
    // Non-fatal — if the old alarm still fires later it just triggers a
    // harmless extra rebuild.
  }
}

