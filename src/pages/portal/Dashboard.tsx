import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar, Image, Megaphone, DollarSign, TrendingDown, TrendingUp,
  ShieldCheck, HardDrive, Activity, Clock
} from 'lucide-react'
import { dbGet } from '@/lib/firebase'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { StatCard, PageHeader } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'

interface DashData {
  eventsCount: number
  imagesCount: number
  announcementsCount: number
  income: number
  expenses: number
  balance: number
  pendingAudits: number
  lastBackup: number | null
}

export function Dashboard() {
  const { profile } = useAuth()
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentLogs, setRecentLogs] = useState<{ id: string; action: string; userEmail: string; timestamp: number; role: string }[]>([])

  useEffect(() => {
    Promise.all([
      dbGet<Record<string, unknown>>('events'),
      dbGet<Record<string, unknown>>('gallery'),
      dbGet<Record<string, unknown>>('announcements'),
      dbGet<Record<string, { type: string; amount: number; status: string }>>('transactions'),
      dbGet<Record<string, unknown>>('backups'),
      dbGet<Record<string, { action: string; userEmail: string; timestamp: number; role: string }>>('logs'),
    ]).then(([events, gallery, announcements, transactions, backups, logs]) => {
      const txList = transactions ? Object.values(transactions) : []
      const income = txList.filter((t) => t.type === 'income' && t.status === 'approved').reduce((s, t) => s + t.amount, 0)
      const expenses = txList.filter((t) => t.type === 'expense' && t.status === 'approved').reduce((s, t) => s + t.amount, 0)
      const pending = txList.filter((t) => t.status === 'pending').length

      const backupList = backups ? Object.values(backups) as { createdAt: number }[] : []
      const lastBackup = backupList.length > 0 ? Math.max(...backupList.map((b) => b.createdAt)) : null

      setData({
        eventsCount: events ? Object.keys(events).length : 0,
        imagesCount: gallery ? Object.keys(gallery).length : 0,
        announcementsCount: announcements ? Object.keys(announcements).length : 0,
        income,
        expenses,
        balance: income - expenses,
        pendingAudits: pending,
        lastBackup,
      })

      if (logs) {
        const logList = Object.entries(logs)
          .map(([id, v]) => ({ id, ...v }))
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 8)
        setRecentLogs(logList)
      }
    }).finally(() => setLoading(false))
  }, [])

  const stats = data ? [
    { label: 'Events', value: data.eventsCount, icon: Calendar, color: 'gold' as const },
    { label: 'Gallery Images', value: data.imagesCount, icon: Image, color: 'green' as const },
    { label: 'Announcements', value: data.announcementsCount, icon: Megaphone, color: 'brand' as const },
    { label: 'Current Balance', value: formatCurrency(data.balance), icon: DollarSign, color: 'gold' as const },
    { label: 'Total Income', value: formatCurrency(data.income), icon: TrendingUp, color: 'green' as const },
    { label: 'Total Expenses', value: formatCurrency(data.expenses), icon: TrendingDown, color: 'red' as const },
    { label: 'Pending Audits', value: data.pendingAudits, icon: ShieldCheck, color: data.pendingAudits > 0 ? 'red' as const : 'green' as const },
    { label: 'Last Backup', value: data.lastBackup ? formatDateTime(data.lastBackup) : 'Never', icon: HardDrive, color: 'gray' as const },
  ] : []

  const actionColors: Record<string, string> = {
    LOGIN: 'text-brand-400',
    LOGOUT: 'text-surface-400',
    CREATE: 'text-emerald-400',
    UPDATE: 'text-gold-400',
    DELETE: 'text-red-400',
    APPROVE: 'text-emerald-400',
    REJECT: 'text-red-400',
    FLAG: 'text-yellow-400',
    BACKUP: 'text-brand-400',
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}${profile?.email ? `, ${profile.email.split('@')[0]}` : ''}`}
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
              const action = Object.keys(actionColors).find((k) => log.action?.startsWith(k)) ?? ''
              return (
                <div key={log.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-800/20 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0">
                    <Clock size={12} className="text-surface-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-200">
                      <span className="text-surface-400">{log.userEmail}</span>
                      {' · '}
                      <span className={actionColors[action] ?? 'text-surface-300'}>{log.action}</span>
                    </p>
                    <p className="text-xs text-surface-600 capitalize">{log.role}</p>
                  </div>
                  <p className="text-xs text-surface-600 flex-shrink-0">{formatDateTime(log.timestamp)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
