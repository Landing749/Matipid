import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { v4 as uuid } from 'uuid'
import {
  DollarSign, Plus, TrendingUp, TrendingDown, Upload, Filter, X, Eye
} from 'lucide-react'
import { dbGet, dbSet, dbUpdate, logActivity, saveVersion } from '@/lib/firebase'
import { uploadImage } from '@/lib/cloudinary'
import { formatCurrency, formatDate, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Modal, StatusBadge, PageHeader, EmptyState, Spinner, StatCard } from '@/components/ui'

interface Transaction {
  id: string
  uuid: string
  type: 'income' | 'expense'
  title: string
  description?: string
  amount: number
  category: string
  receiptUrl?: string
  createdBy: string
  createdByEmail: string
  createdAt: number
  updatedAt: number
  status: string
  version: number
}

const schema = z.object({
  type: z.enum(['income', 'expense']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
})

type FormValues = z.infer<typeof schema>

export function Finance() {
  const { user, profile, isTreasurer, isAdmin } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [receipt, setReceipt] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [viewTx, setViewTx] = useState<Transaction | null>(null)

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'expense' },
  })

  const txType = watch('type')

  async function load() {
    const data = await dbGet<Record<string, Transaction>>('transactions')
    if (data) {
      setTransactions(
        Object.entries(data)
          .map(([id, v]) => ({ ...v, id }))
          .filter((t) => t.status !== 'archived')
          .sort((a, b) => b.createdAt - a.createdAt)
      )
    } else {
      setTransactions([])
    }
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  async function onSubmit(values: FormValues) {
    if (!user || !profile) return

    let receiptUrl: string | undefined
    if (receipt) {
      setUploading(true)
      try {
        const res = await uploadImage(receipt, 'receipts', setUploadProgress)
        receiptUrl = res.secure_url
      } catch {
        toast.error('Receipt upload failed.')
        setUploading(false)
        return
      }
      setUploading(false)
    }

    const id = uuid()
    const now = Date.now()
    const tx: Transaction = {
      id,
      uuid: id,
      type: values.type,
      title: values.title,
      description: values.description,
      amount: values.amount,
      category: values.category,
      receiptUrl,
      createdBy: user.uid,
      createdByEmail: profile.email,
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      version: 1,
    }

    await dbSet(`transactions/${id}`, tx)
    await saveVersion('transactions', id, tx, user.uid, profile.email)
    await logActivity({
      userUid: user.uid,
      userEmail: profile.email,
      role: profile.role,
      action: 'CREATE_TRANSACTION',
      targetResource: 'transactions',
      targetId: id,
      newValue: tx,
    })

    toast.success(`${values.type === 'income' ? 'Income' : 'Expense'} recorded. Pending audit.`)
    reset()
    setReceipt(null)
    setShowModal(false)
    load()
  }

  const canCreate = isTreasurer || isAdmin

  const filtered = transactions.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterType !== 'all' && t.type !== filterType) return false
    return true
  })

  const income = transactions.filter((t) => t.type === 'income' && t.status === 'approved').reduce((s, t) => s + t.amount, 0)
  const expenses = transactions.filter((t) => t.type === 'expense' && t.status === 'approved').reduce((s, t) => s + t.amount, 0)
  const balance = income - expenses
  const pending = transactions.filter((t) => t.status === 'pending').length

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="Finance"
        description="Record and track income and expenses."
        action={
          canCreate && (
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus size={16} /> New Transaction
            </button>
          )
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Balance" value={formatCurrency(balance)} icon={DollarSign} color="gold" loading={loading} />
        <StatCard label="Income" value={formatCurrency(income)} icon={TrendingUp} color="green" loading={loading} />
        <StatCard label="Expenses" value={formatCurrency(expenses)} icon={TrendingDown} color="red" loading={loading} />
        <StatCard label="Pending Audits" value={pending} icon={Filter} color={pending > 0 ? 'red' : 'gray'} loading={loading} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['all', 'pending', 'approved', 'flagged', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
              filterStatus === s ? 'bg-brand-600/20 text-brand-300' : 'bg-surface-800/50 text-surface-400 hover:bg-surface-800'
            }`}
          >
            {s}
          </button>
        ))}
        <div className="w-px bg-surface-800 mx-1" />
        {['all', 'income', 'expense'].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
              filterType === t ? 'bg-brand-600/20 text-brand-300' : 'bg-surface-800/50 text-surface-400 hover:bg-surface-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-surface-500 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={DollarSign} title="No transactions found" description="Adjust filters or add a new transaction." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800/60">
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-surface-500">Type</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-surface-500">Title</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-surface-500">Category</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-wider text-surface-500">Amount</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-surface-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-surface-500">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr key={tx.id} className="table-row">
                    <td className="px-5 py-3.5">
                      <span className={tx.type === 'income' ? 'badge-green' : 'badge-red'}>
                        {tx.type === 'income' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-surface-100 font-medium truncate max-w-[200px]">{tx.title}</p>
                      {tx.description && <p className="text-surface-500 text-xs truncate max-w-[200px]">{tx.description}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-surface-400">{tx.category}</td>
                    <td className={`px-4 py-3.5 text-right font-semibold tabular-nums ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={tx.status} /></td>
                    <td className="px-4 py-3.5 text-surface-500">{formatDate(tx.createdAt)}</td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => setViewTx(tx)}
                        className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-all"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); reset(); setReceipt(null) }} title="New Transaction" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-surface-700/60">
            {(['income', 'expense'] as const).map((t) => (
              <label key={t} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium cursor-pointer transition-all capitalize ${
                txType === t ? (t === 'income' ? 'bg-emerald-600/20 text-emerald-300' : 'bg-red-600/20 text-red-300') : 'text-surface-400 hover:bg-surface-800'
              }`}>
                <input type="radio" value={t} {...register('type')} className="sr-only" />
                {t === 'income' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {t}
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Title</label>
              <input className="input" placeholder="e.g. Chalk and whiteboard markers" {...register('title')} />
              {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="label">Amount (₱)</label>
              <input type="number" step="0.01" className="input" placeholder="0.00" {...register('amount')} />
              {errors.amount && <p className="text-xs text-red-400 mt-1">{errors.amount.message}</p>}
            </div>

            <div>
              <label className="label">Category</label>
              <select className="input" {...register('category')}>
                <option value="">Select category</option>
                {(txType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.category && <p className="text-xs text-red-400 mt-1">{errors.category.message}</p>}
            </div>

            <div className="col-span-2">
              <label className="label">Description (optional)</label>
              <textarea className="input h-20 resize-none" placeholder="Additional details…" {...register('description')} />
            </div>
          </div>

          {/* Receipt upload */}
          <div>
            <label className="label">Receipt (optional)</label>
            <label className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/60 border-dashed cursor-pointer hover:border-brand-600/50 transition-all">
              <Upload size={16} className="text-surface-400 flex-shrink-0" />
              <span className="text-sm text-surface-400">{receipt ? receipt.name : 'Upload receipt image'}</span>
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
            </label>
            {uploading && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full bg-surface-800 overflow-hidden">
                  <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-xs text-surface-500 mt-1">Uploading… {uploadProgress}%</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowModal(false); reset(); setReceipt(null) }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting || uploading} className="btn-primary">
              {isSubmitting || uploading ? <Spinner size={16} /> : 'Save Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View modal */}
      {viewTx && (
        <Modal open={!!viewTx} onClose={() => setViewTx(null)} title="Transaction Details" size="md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={viewTx.type === 'income' ? 'badge-green' : 'badge-red'}>{viewTx.type}</span>
              <StatusBadge status={viewTx.status} />
            </div>
            <div>
              <p className="text-lg font-bold text-surface-100">{viewTx.title}</p>
              {viewTx.description && <p className="text-surface-400 text-sm mt-1">{viewTx.description}</p>}
            </div>
            <div className={`text-2xl font-bold ${viewTx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
              {viewTx.type === 'income' ? '+' : '-'}{formatCurrency(viewTx.amount)}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-surface-500 text-xs uppercase tracking-wider mb-1">Category</p>
                <p className="text-surface-200">{viewTx.category}</p>
              </div>
              <div>
                <p className="text-surface-500 text-xs uppercase tracking-wider mb-1">Date</p>
                <p className="text-surface-200">{formatDate(viewTx.createdAt)}</p>
              </div>
              <div>
                <p className="text-surface-500 text-xs uppercase tracking-wider mb-1">Recorded by</p>
                <p className="text-surface-200">{viewTx.createdByEmail}</p>
              </div>
              <div>
                <p className="text-surface-500 text-xs uppercase tracking-wider mb-1">Version</p>
                <p className="text-surface-200">v{viewTx.version}</p>
              </div>
            </div>
            {viewTx.receiptUrl && (
              <div>
                <p className="text-surface-500 text-xs uppercase tracking-wider mb-2">Receipt</p>
                <a href={viewTx.receiptUrl} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-surface-700">
                  <img src={viewTx.receiptUrl} alt="Receipt" className="w-full h-48 object-cover hover:opacity-90 transition-opacity" />
                </a>
              </div>
            )}
          </div>
        </Modal>
      )}
    </motion.div>
  )
}
