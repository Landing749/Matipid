import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, MessageSquare, CheckCircle2, XCircle, Flag, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { dbGet, dbUpdate, dbPush, logActivity, saveVersion } from '@/lib/firebase'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Modal, StatusBadge, PageHeader, EmptyState, Spinner } from '@/components/ui'
import { ExportButtons } from '@/components/ExportButtons'

interface Transaction {
  id: string
  type: 'income' | 'expense'
  title: string
  amount: number
  category: string
  receiptUrl?: string
  createdByEmail: string
  createdAt: number
  status: string
  version: number
  description?: string
}

interface AuditRecord {
  id: string
  txId: string
  txTitle: string
  reviewerId: string
  reviewerEmail: string
  action: 'APPROVE' | 'FLAG' | 'REJECT'
  comment?: string
  timestamp: number
}

export function Audit() {
  const { user, profile, isAuditor, isAdmin } = useAuth()
  const [pending, setPending] = useState<Transaction[]>([])
  const [allTx, setAllTx] = useState<Transaction[]>([])
  const [auditHistory, setAuditHistory] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [viewTx, setViewTx] = useState<Transaction | null>(null)
  const [comment, setComment] = useState('')
  const [acting, setActing] = useState<string | null>(null)
  const [tab, setTab] = useState<'pending' | 'history'>('pending')

  const canAudit = isAuditor || isAdmin

  async function load() {
    const [txData, auditData] = await Promise.all([
      dbGet<Record<string, Transaction>>('transactions'),
      dbGet<Record<string, AuditRecord>>('audit_records'),
    ])

    if (txData) {
      const list = Object.entries(txData)
        .map(([id, v]) => ({ ...v, id }))
        .filter((t) => t.status !== 'archived')
        .sort((a, b) => b.createdAt - a.createdAt)
      setPending(list.filter((t) => t.status === 'pending'))
      setAllTx(list)
    }

    if (auditData) {
      setAuditHistory(
        Object.entries(auditData)
          .map(([id, v]) => ({ ...v, id }))
          .sort((a, b) => b.timestamp - a.timestamp)
      )
    }
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  async function doAction(tx: Transaction, action: 'APPROVE' | 'FLAG' | 'REJECT') {
    if (!user || !profile || !canAudit) return
    setActing(tx.id + action)

    const statusMap = { APPROVE: 'approved', FLAG: 'flagged', REJECT: 'rejected' } as const
    const newStatus = statusMap[action]
    const now = Date.now()

    // Update transaction status
    await dbUpdate(`transactions/${tx.id}`, {
      status: newStatus,
      updatedAt: now,
      version: (tx.version ?? 1) + 1,
    })

    // Save version snapshot
    await saveVersion('transactions', tx.id, { ...tx, status: newStatus }, user.uid, profile.email)

    // Write immutable audit record
    const record: Omit<AuditRecord, 'id'> = {
      txId: tx.id,
      txTitle: tx.title,
      reviewerId: user.uid,
      reviewerEmail: profile.email,
      action,
      comment: comment.trim() || undefined,
      timestamp: now,
    }
    await dbPush('audit_records', record)

    // Activity log
    await logActivity({
      userUid: user.uid,
      userEmail: profile.email,
      role: profile.role,
      action: `${action}_TRANSACTION`,
      targetResource: 'transactions',
      targetId: tx.id,
      previousValue: { status: tx.status },
      newValue: { status: newStatus },
      details: comment.trim() || undefined,
    })

    const labels = { APPROVE: 'approved', FLAG: 'flagged', REJECT: 'rejected' }
    toast.success(`Transaction ${labels[action]}.`)
    setComment('')
    setViewTx(null)
    setActing(null)
    load()
  }

  const actionBtn = (tx: Transaction, action: 'APPROVE' | 'FLAG' | 'REJECT') => {
    const cfg = {
      APPROVE: { cls: 'btn-gold', icon: CheckCircle2, label: 'Approve' },
      FLAG: { cls: 'btn-warning', icon: Flag, label: 'Flag' },
      REJECT: { cls: 'btn-danger', icon: XCircle, label: 'Reject' },
    }[action]
    return (
      <button
        key={action}
        onClick={() => doAction(tx, action)}
        disabled={acting === tx.id + action}
        className={cfg.cls + ' text-xs py-1.5 px-3'}
      >
        {acting === tx.id + action ? <Spinner size={12} /> : <cfg.icon size={12} />}
        {cfg.label}
      </button>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="Audit"
        description="Review and approve financial transactions."
        action={<ExportButtons kind="audit" />}
      />

      {/* Summary row */}
      <div className="flex gap-4 mb-6">
        <div className="card flex-1">
          <p className="text-2xl font-bold text-surface-100">{pending.length}</p>
          <p className="text-xs text-surface-500 mt-1 uppercase tracking-wider">Pending Review</p>
        </div>
        <div className="card flex-1">
          <p className="text-2xl font-bold text-emerald-600">{allTx.filter((t) => t.status === 'approved').length}</p>
          <p className="text-xs text-surface-500 mt-1 uppercase tracking-wider">Approved</p>
        </div>
        <div className="card flex-1">
          <p className="text-2xl font-bold text-red-600">{allTx.filter((t) => t.status === 'flagged' || t.status === 'rejected').length}</p>
          <p className="text-xs text-surface-500 mt-1 uppercase tracking-wider">Flagged / Rejected</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/50 rounded-xl p-1 w-fit border border-white/70 shadow-clay-sm">
        {([['pending', 'Pending'] , ['history', 'Audit History']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white text-brand-700 shadow-clay-sm' : 'text-surface-400 hover:text-surface-200'}`}
          >
            {label}
            {key === 'pending' && pending.length > 0 && (
              <span className="ml-2 badge-red py-0.5 px-1.5 text-xs">{pending.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'pending' ? (
        loading ? (
          <div className="text-center text-surface-500 py-12">Loading…</div>
        ) : pending.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="All caught up" description="No transactions pending review." />
        ) : (
          <div className="space-y-3">
            {pending.map((tx) => (
              <div key={tx.id} className="card-hover">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={tx.type === 'income' ? 'badge-green' : 'badge-red'}>{tx.type}</span>
                      <StatusBadge status={tx.status} />
                    </div>
                    <p className="font-medium text-surface-100 truncate">{tx.title}</p>
                    <p className="text-xs text-surface-500 mt-1">{tx.category} · {tx.createdByEmail} · {formatDate(tx.createdAt)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-lg font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                    <button
                      onClick={() => { setViewTx(tx); setComment('') }}
                      className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 mt-1 ml-auto"
                    >
                      <Eye size={12} /> Details
                    </button>
                  </div>
                </div>

                {canAudit && (
                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-surface-800/60">
                    <div className="flex-1 min-w-0">
                      <input
                        placeholder="Audit comment (optional)…"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="input text-xs py-1.5"
                      />
                    </div>
                    <div className="flex gap-2">
                      {actionBtn(tx, 'APPROVE')}
                      {actionBtn(tx, 'FLAG')}
                      {actionBtn(tx, 'REJECT')}
                    </div>
                  </div>
                )}

                {!canAudit && (
                  <p className="text-xs text-surface-600 mt-3 italic">Only auditors can review transactions.</p>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="card p-0 overflow-hidden">
          {auditHistory.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No audit records" />
          ) : (
            <div className="divide-y divide-surface-800/60">
              {auditHistory.map((record) => (
                <div key={record.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-surface-800/20 transition-colors">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    record.action === 'APPROVE' ? 'bg-emerald-500/15' :
                    record.action === 'FLAG' ? 'bg-yellow-500/15' : 'bg-red-500/15'
                  }`}>
                    {record.action === 'APPROVE' ? <CheckCircle2 size={14} className="text-emerald-600" /> :
                     record.action === 'FLAG' ? <Flag size={14} className="text-yellow-600" /> :
                     <XCircle size={14} className="text-red-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-100">
                      <span className="font-medium">{record.txTitle}</span>
                      <span className="text-surface-400"> was </span>
                      <span className={record.action === 'APPROVE' ? 'text-emerald-600' : record.action === 'FLAG' ? 'text-yellow-600' : 'text-red-600'}>
                        {record.action.toLowerCase()}d
                      </span>
                    </p>
                    <p className="text-xs text-surface-500 mt-0.5">by {record.reviewerEmail}</p>
                    {record.comment && (
                      <p className="text-xs text-surface-400 mt-1 flex items-center gap-1">
                        <MessageSquare size={10} /> "{record.comment}"
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-surface-600 flex-shrink-0">{formatDateTime(record.timestamp)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      {viewTx && (
        <Modal open={!!viewTx} onClose={() => setViewTx(null)} title="Transaction Review" size="md">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={viewTx.type === 'income' ? 'badge-green' : 'badge-red'}>{viewTx.type}</span>
              <StatusBadge status={viewTx.status} />
            </div>
            <p className="text-lg font-semibold text-surface-100">{viewTx.title}</p>
            {viewTx.description && <p className="text-surface-400 text-sm">{viewTx.description}</p>}
            <p className={`text-2xl font-bold ${viewTx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
              {viewTx.type === 'income' ? '+' : '-'}{formatCurrency(viewTx.amount)}
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-surface-500 text-xs uppercase mb-1">Category</p><p className="text-surface-200">{viewTx.category}</p></div>
              <div><p className="text-surface-500 text-xs uppercase mb-1">Date</p><p className="text-surface-200">{formatDate(viewTx.createdAt)}</p></div>
              <div className="col-span-2"><p className="text-surface-500 text-xs uppercase mb-1">Recorded by</p><p className="text-surface-200">{viewTx.createdByEmail}</p></div>
            </div>
            {viewTx.receiptUrl && (
              <a href={viewTx.receiptUrl} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-surface-700">
                <img src={viewTx.receiptUrl} alt="Receipt" className="w-full h-40 object-cover" />
              </a>
            )}
            {canAudit && viewTx.status === 'pending' && (
              <div className="space-y-3 pt-3 border-t border-surface-800/60">
                <div>
                  <label className="label">Audit Comment</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="input h-20 resize-none"
                    placeholder="Optional comment…"
                  />
                </div>
                <div className="flex gap-2">
                  {actionBtn(viewTx, 'APPROVE')}
                  {actionBtn(viewTx, 'FLAG')}
                  {actionBtn(viewTx, 'REJECT')}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </motion.div>
  )
}
