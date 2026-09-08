import type { PublishScheduler } from './publishScheduler'

export interface Env {
  FIREBASE_DB_URL: string
  SECTION_NAME: string
  ALLOWED_ORIGINS: string
  GITHUB_OWNER: string
  GITHUB_REPO: string
  /** Secret — set via `wrangler secret put GITHUB_TOKEN`, never in wrangler.toml. */
  GITHUB_TOKEN: string
  /** Durable Object namespace — one instance per scheduled announcement, holds a single alarm. */
  PUBLISH_SCHEDULER: DurableObjectNamespace<PublishScheduler>
  /** Cloudflare Browser Rendering binding — real headless Chrome, used to render the Section Report's HTML to PDF. See wrangler.toml `[browser]`. */
  BROWSER: Fetcher
}

export interface Transaction {
  id: string
  uuid?: string
  type: 'income' | 'expense'
  title: string
  description?: string
  amount: number
  category: string
  receiptUrl?: string
  createdBy?: string
  createdByEmail?: string
  createdAt: number
  updatedAt?: number
  status: string
  version?: number
}

export interface AuditRecord {
  id: string
  txId: string
  txTitle: string
  reviewerId?: string
  reviewerEmail: string
  action: 'APPROVE' | 'FLAG' | 'REJECT'
  comment?: string
  timestamp: number
}

export interface ExportFilters {
  status: string
  type: string
  from: number | null
  to: number | null
}

export interface EventRecord {
  id: string
  title: string
  description?: string
  date: number
  location?: string
  tags?: string[]
  createdByEmail?: string
}

export interface RsvpNode {
  count?: number
  list?: Record<string, { name: string; at: number }>
}

/** `settings/photoOfTheYear` in RTDB — officer-set via the portal (or the DB console) whenever the section picks a new one. */
export interface PhotoOfTheYearSetting {
  imageUrl: string
  caption?: string
  credit?: string
}

/**
 * `settings/reportSignatories` in RTDB — the printed names for the
 * Section Report's signature page, editable without a redeploy. Any
 * field left unset (or blank) still gets a signature line and role
 * label — that officer just signs by hand instead.
 */
export interface ReportSignatoriesSetting {
  auditorName?: string
  treasurerName?: string
  adviserName?: string
}
