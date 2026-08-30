export interface Env {
  FIREBASE_DB_URL: string
  SECTION_NAME: string
  ALLOWED_ORIGINS: string
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
