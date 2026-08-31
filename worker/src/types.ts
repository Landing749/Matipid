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
