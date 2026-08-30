import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Image, Megaphone, DollarSign, TrendingDown, TrendingUp, ShieldCheck, HardDrive, Activity, Clock, Users } from 'lucide-react'
import { ref, onValue, db } from '@/lib/firebase'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { StatCard, PageHeader } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'

interface LiveCounts {
  events: number
  gallery: number
  announcements: number
  officers: number
  income: number
  expenses: number
  pendingAudits: number
  lastBackup: number | null
}

interface LogEntry {
  id: string
  action: string
  userEmail: string
  timestamp: number
  role: string
}

export function Dashboard() {
  const { profile } = useAuth()
  const [counts, setCounts] = useState<LiveCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([])

  useEffect(() => {
    const unsubs: (() => void)[] = []
    const state: Record<string, unknown> = {}
    let resolved = 0
    const TOTAL = 7

    function tryResolve() {
      resolved++
      if (resolved >= TOTAL) {
        const txList = state.transactions
          ? Object.values(state.transactions as Record<string, { type: string; amount: number; status: string }>)
          : []
        const income = txList
          .filter((t) => t.type === 'income' && t.status === 'approved')
          .reduce((s, t) => s + t.amount, 0)
        const expenses = txList
          .filter((t) => t.type === 'expense' && t.status === 'approved')
          .reduce((s, t) => s + t.amount, 0)
        const pendingAudits = txList.filter((t) => t.status === 'pending').length

        const backupList = state.backups
          ? Object.values(state.backups as Record<string, { createdAt: number }>)
          : []
        const lastBackup = backupList.length > 0
          ? Math.max(...backupList.map((b) => b.createdAt))
          : null

        setCounts({
          events: state.events ? Object.keys(state.events as object).length : 0,
          gallery: state.gallery ? Object.keys(state.gallery as object).length : 0,
          announcements: state.announcements ? Object.keys(state.announcements as object).length : 0,
          officers: state.officers ? Object.keys(state.officers as object).length : 0,
          income,
          expenses,
          pendingAudits,
          lastBackup,
        })
        setLoading(false)
      }
    }

    const collections = ['events', 'gallery', 'announcements', 'officers', 'transactions', 'backups'] as const
    collections.forEach((col) => {
      const unsub = onValue(ref(db, col), (snap) => {
        state[col] = snap.exists() ? snap.val() : null
        tryResolve()
      }, { onlyOnce: true })
      unsubs.push(() => {})
    })

    // Live logs feed
    const logsUnsub = onValue(ref(db, 'logs'), (snap) => {
      if (snap.exists()) {
        const list: LogEntry[] = []
        snap.forEach((child) => {
          list.push({ id: child.key!, ...child.val() })
        })
        list.sort((a, b) => b.timestamp - a.timestamp)
        setRecentLogs(list.slice(0, 10))
      }
      state['logs'] = true
      tryResolve()
    })
    unsubs.push(logsUnsub)

    return () => unsubs.forEach((u) => u())
  }, [])

  const balance = counts ? counts.income - counts.expenses : 0

  const stats = counts ? [
    { label: 'Events', value: counts.events, icon: Calendar, color: 'gold' as const },
    { label: 'Gallery Images', value: counts.gallery, icon: Image, color: 'green' as const },
    { label: 'Announcements', value: counts.announcements, icon: Megaphone, color: 'brand' as const },
    { label: 'Officers', value: counts.officers, icon: Users, color: 'gray' as const },
    { label: 'Current Balance', value: formatCurrency(balance), icon: DollarSign, color: 'gold' as const },
    { label: 'Total Income', value: formatCurrency(counts.income), icon: TrendingUp, color: 'green' as const },
    { label: 'Total Expenses', value: formatCurrency(counts.expenses), icon: TrendingDown, color: 'red' as const },
    { label: 'Pending Audits', value: counts.pendingAudits, icon: ShieldCheck, color: counts.pendingAudits > 0 ? 'red' as const : 'green' as const },
  ] : []

  const actionColors: Record<string, string> = {
    LOGIN: 'text-brand-600', LOGOUT: 'text-surface-400',
    CREATE: 'text-emerald-600', UPDATE: 'text-gold-700',
    DELETE: 'text-red-600', APPROVE: 'text-emerald-600',
    REJECT: 'text-red-600', FLAG: 'text-yellow-600',
    UPLOAD: 'text-brand-600', BACKUP: 'text-brand-600',
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = profile?.email?.split('@')[0] ?? ''

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <PageHeader
        title={`${greeting}${name ? `, ${name}` : ''}`}
        description="Here's what's happening across your section."
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <StatCard key={i} label="" value="" icon={Activity} loading />)
          : stats.map((s) => <StatCard key={s.label} {...s} />)
        }
      </div>

      {/* Recent activity */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-800/60 flex items-center gap-2">
          <Activity size={16} className="text-surface-400" />
          <h2 className="text-sm font-semibold text-surface-200">Recent Activity</h2>
        </div>

        {recentLogs.length === 0 ? (
          <div className="px-5 py-8 text-center text-surface-500 text-sm">No activity recorded yet.</div>
        ) : (
          <div className="divide-y divide-surface-800/40">
            {recentLogs.map((log) => {
              const key = Object.keys(actionColors).find((k) => log.action?.startsWith(k)) ?? ''
              return (
                <div key={log.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-800/20 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0">
                    <Clock size={12} className="text-surface-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-200">
                      <span className="text-surface-400">{log.userEmail}</span>
                      {' · '}
                      <span className={actionColors[key] ?? 'text-surface-300'}>{log.action}</span>
                    </p>
                    <p className="text-xs text-surface-600 capitalize">{log.role}</p>
                  </div>
                  <p className="text-xs text-surface-600 flex-shrink-0 hidden sm:block">{formatDateTime(log.timestamp)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
