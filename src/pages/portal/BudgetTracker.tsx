import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Target, Plus, Trash2, AlertTriangle, CheckCircle, TrendingDown, X } from 'lucide-react'
import { dbGet, dbSet, dbPush, dbRemove, logActivity } from '@/lib/firebase'
import { formatCurrency, EXPENSE_CATEGORIES } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, Modal, EmptyState, Spinner } from '@/components/ui'

interface BudgetGoal {
  id: string
  category: string
  limit: number
  period: 'monthly' | 'schoolyear'
  createdAt: number
  createdBy: string
}

interface Transaction {
  type: string
  amount: number
  status: string
  category: string
  createdAt: number
}

const schema = z.object({
  category: z.string().min(1, 'Category required'),
  limit: z.coerce.number().positive('Must be positive'),
  period: z.enum(['monthly', 'schoolyear']),
})
type FormValues = z.infer<typeof schema>

function BudgetBar({ spent, limit }: { spent: number; limit: number }) {
  const pct = Math.min((spent / limit) * 100, 100)
  const over = spent > limit
  const warn = pct >= 80

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className={over ? 'text-red-400 font-medium' : warn ? 'text-yellow-400' : 'text-surface-400'}>
          {over ? `Over by ${formatCurrency(spent - limit)}` : `${formatCurrency(spent)} spent`}
        </span>
        <span className="text-surface-500">{formatCurrency(limit)} limit</span>
      </div>
      <div className="h-2 rounded-full bg-surface-800 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className={`h-full rounded-full ${over ? 'bg-red-500' : warn ? 'bg-yellow-500' : 'bg-brand-500'}`}
        />
      </div>
    </div>
  )
}

export function BudgetTracker() {
  const { user, profile, isAdmin } = useAuth()
  const [goals, setGoals] = useState<BudgetGoal[]>([])
  const [spending, setSpending] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { period: 'monthly' },
  })

  async function load() {
    const [goalsData, txData] = await Promise.all([
      dbGet<Record<string, Omit<BudgetGoal, 'id'>>>('budget_goals'),
      dbGet<Record<string, Transaction>>('transactions'),
    ])

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

    const spendMap: Record<string, number> = {}
    if (txData) {
      Object.values(txData)
        .filter((t) => t.type === 'expense' && t.status === 'approved')
        .forEach((t) => {
          // Always track schoolyear total
          spendMap[`${t.category}_schoolyear`] = (spendMap[`${t.category}_schoolyear`] ?? 0) + t.amount
          // Track monthly only if in current month
          if (t.createdAt >= monthStart) {
            spendMap[`${t.category}_monthly`] = (spendMap[`${t.category}_monthly`] ?? 0) + t.amount
          }
        })
    }
    setSpending(spendMap)

    if (goalsData) {
      setGoals(
        Object.entries(goalsData)
          .map(([id, v]) => ({ ...v, id }))
          .sort((a, b) => a.category.localeCompare(b.category))
      )
    } else {
      setGoals([])
    }
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  async function onSubmit(values: FormValues) {
    if (!user || !profile) return
    const existing = goals.find((g) => g.category === values.category && g.period === values.period)
    if (existing) {
      toast.error(`A ${values.period} budget for "${values.category}" already exists.`)
      return
    }
    const goal: Omit<BudgetGoal, 'id'> = {
      category: values.category,
      limit: values.limit,
      period: values.period,
      createdAt: Date.now(),
      createdBy: profile.email,
    }
    await dbPush('budget_goals', goal)
    await logActivity({
      userUid: user.uid,
      userEmail: profile.email,
      role: profile.role,
      action: 'CREATE_BUDGET_GOAL',
      targetResource: 'budget_goals',
      newValue: goal,
    })
    toast.success('Budget goal created.')
    setShowModal(false)
    reset()
    await load()
  }

  async function handleDelete(goal: BudgetGoal) {
    if (!user || !profile) return
    setDeleting(goal.id)
    await dbRemove(`budget_goals/${goal.id}`)
    await logActivity({
      userUid: user.uid,
      userEmail: profile.email,
      role: profile.role,
      action: 'DELETE_BUDGET_GOAL',
      targetResource: 'budget_goals',
      targetId: goal.id,
    })
    toast.success('Budget goal removed.')
    await load()
    setDeleting(null)
  }

  const overBudget = goals.filter((g) => {
    const spent = spending[`${g.category}_${g.period}`] ?? 0
    return spent > g.limit
  })

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <PageHeader
        title="Budget Tracker"
        description="Set spending limits per category and monitor compliance."
        action={
          isAdmin
            ? <button onClick={() => setShowModal(true)} className="btn-primary">
                <Plus size={15} /> New Goal
              </button>
            : undefined
        }
      />

      {/* Over-budget alert banner */}
      <AnimatePresence>
        {overBudget.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300"
          >
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">
                {overBudget.length} budget{overBudget.length > 1 ? 's' : ''} exceeded
              </p>
              <p className="text-xs text-red-400 mt-0.5">
                {overBudget.map((g) => `${g.category} (${g.period})`).join(', ')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse space-y-3">
              <div className="h-4 w-32 bg-surface-800 rounded" />
              <div className="h-2 w-full bg-surface-800 rounded-full" />
              <div className="h-3 w-24 bg-surface-800 rounded" />
            </div>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No budget goals yet"
          description="Set spending limits to track your section's financial discipline."
          action={
            isAdmin
              ? <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={14} />New Goal</button>
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal, i) => {
            const spent = spending[`${goal.category}_${goal.period}`] ?? 0
            const pct = Math.min((spent / goal.limit) * 100, 100)
            const over = spent > goal.limit
            const warn = pct >= 80 && !over
            const ok = pct < 80

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className={`card-hover relative group ${over ? 'ring-1 ring-red-500/30' : warn ? 'ring-1 ring-yellow-500/20' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-surface-100 font-semibold text-sm">{goal.category}</p>
                    <p className="text-surface-500 text-xs mt-0.5 capitalize">{goal.period === 'schoolyear' ? 'School Year' : 'This Month'}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {over ? (
                      <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
                        <AlertTriangle size={12} /> Over
                      </span>
                    ) : warn ? (
                      <span className="flex items-center gap-1 text-xs text-yellow-400 font-medium">
                        <AlertTriangle size={12} /> Warning
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                        <CheckCircle size={12} /> OK
                      </span>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(goal)}
                        disabled={deleting === goal.id}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-surface-600 hover:text-red-400 hover:bg-surface-800 transition-all"
                      >
                        {deleting === goal.id ? <Spinner size={12} /> : <Trash2 size={12} />}
                      </button>
                    )}
                  </div>
                </div>

                <BudgetBar spent={spent} limit={goal.limit} />

                <div className="flex items-center justify-between mt-3">
                  <span className={`text-lg font-bold tabular-nums ${over ? 'text-red-400' : 'text-surface-100'}`}>
                    {Math.round(pct)}%
                  </span>
                  <span className="text-xs text-surface-500">
                    {formatCurrency(Math.max(0, goal.limit - spent))} remaining
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Summary footer */}
      {goals.length > 0 && !loading && (
        <div className="mt-6 card bg-surface-900/40">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-400">{goals.filter((g) => (spending[`${g.category}_${g.period}`] ?? 0) < g.limit * 0.8).length}</p>
              <p className="text-xs text-surface-500 mt-1">Under Budget</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-400">{goals.filter((g) => { const p = (spending[`${g.category}_${g.period}`] ?? 0) / g.limit; return p >= 0.8 && p < 1 }).length}</p>
              <p className="text-xs text-surface-500 mt-1">Near Limit</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{overBudget.length}</p>
              <p className="text-xs text-surface-500 mt-1">Over Budget</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); reset() }} title="New Budget Goal">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Category</label>
            <select className="input" {...register('category')}>
              <option value="">Select category</option>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="text-xs text-red-400 mt-1">{errors.category.message}</p>}
          </div>

          <div>
            <label className="label">Spending Limit (₱)</label>
            <input type="number" step="0.01" className="input" placeholder="0.00" {...register('limit')} />
            {errors.limit && <p className="text-xs text-red-400 mt-1">{errors.limit.message}</p>}
          </div>

          <div>
            <label className="label">Period</label>
            <div className="flex rounded-xl overflow-hidden border border-surface-700/60">
              {(['monthly', 'schoolyear'] as const).map((p) => (
                <label key={p} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium cursor-pointer transition-all capitalize">
                  <input type="radio" value={p} {...register('period')} className="sr-only" />
                  <span className="capitalize">{p === 'schoolyear' ? 'School Year' : 'Monthly'}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowModal(false); reset() }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? <Spinner size={16} /> : 'Create Goal'}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  )
}
