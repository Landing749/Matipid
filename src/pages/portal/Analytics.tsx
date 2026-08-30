import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart2 } from 'lucide-react'
import { dbGet } from '@/lib/firebase'
import { format } from 'date-fns'
import { PageHeader, Skeleton } from '@/components/ui'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const COLORS = ['#7458bd', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899']

const tooltipStyle = {
  contentStyle: { background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: 12 },
  labelStyle: { color: '#f4f4f5' },
  itemStyle: { color: '#a1a1aa' },
}

export function Analytics() {
  const [loading, setLoading] = useState(true)
  const [monthlyFinance, setMonthlyFinance] = useState<{ month: string; income: number; expenses: number; balance: number }[]>([])
  const [expenseByCategory, setExpenseByCategory] = useState<{ name: string; value: number }[]>([])
  const [auditCompletion, setAuditCompletion] = useState<{ name: string; value: number }[]>([])
  const [eventFreq, setEventFreq] = useState<{ month: string; events: number }[]>([])
  const [galleryUploads, setGalleryUploads] = useState<{ month: string; uploads: number }[]>([])
  const [announcementActivity, setAnnouncementActivity] = useState<{ month: string; count: number }[]>([])

  useEffect(() => {
    Promise.all([
      dbGet<Record<string, { type: string; amount: number; status: string; category: string; createdAt: number }>>('transactions'),
      dbGet<Record<string, { date: number }>>('events'),
      dbGet<Record<string, { uploadedAt: number }>>('gallery'),
      dbGet<Record<string, { createdAt: number }>>('announcements'),
    ]).then(([txData, evData, gallData, annData]) => {
      // Monthly finance
      const finByMonth: Record<string, { income: number; expenses: number }> = {}
      if (txData) {
        Object.values(txData).forEach((t) => {
          const key = format(new Date(t.createdAt), 'MMM yy')
          if (!finByMonth[key]) finByMonth[key] = { income: 0, expenses: 0 }
          if (t.status === 'approved') {
            if (t.type === 'income') finByMonth[key].income += t.amount
            else finByMonth[key].expenses += t.amount
          }
        })
      }
      setMonthlyFinance(
        Object.entries(finByMonth)
          .slice(-8)
          .map(([month, v]) => ({ month, ...v, balance: v.income - v.expenses }))
      )

      // Expense by category
      const catMap: Record<string, number> = {}
      if (txData) {
        Object.values(txData).filter((t) => t.type === 'expense' && t.status === 'approved').forEach((t) => {
          catMap[t.category] = (catMap[t.category] ?? 0) + t.amount
        })
      }
      setExpenseByCategory(Object.entries(catMap).map(([name, value]) => ({ name, value })))

      // Audit completion
      if (txData) {
        const statMap: Record<string, number> = {}
        Object.values(txData).forEach((t) => { statMap[(t as { status: string }).status] = (statMap[(t as { status: string }).status] ?? 0) + 1 })
        setAuditCompletion(Object.entries(statMap).map(([name, value]) => ({ name, value })))
      }

      // Event frequency
      const evByMonth: Record<string, number> = {}
      if (evData) {
        Object.values(evData).forEach((e) => {
          const key = format(new Date(e.date), 'MMM yy')
          evByMonth[key] = (evByMonth[key] ?? 0) + 1
        })
      }
      setEventFreq(Object.entries(evByMonth).slice(-8).map(([month, events]) => ({ month, events })))

      // Gallery uploads by month
      const gallByMonth: Record<string, number> = {}
      if (gallData) {
        Object.values(gallData).forEach((g) => {
          const key = format(new Date(g.uploadedAt), 'MMM yy')
          gallByMonth[key] = (gallByMonth[key] ?? 0) + 1
        })
      }
      setGalleryUploads(Object.entries(gallByMonth).slice(-8).map(([month, uploads]) => ({ month, uploads })))

      // Announcement activity
      const annByMonth: Record<string, number> = {}
      if (annData) {
        Object.values(annData).forEach((a) => {
          const key = format(new Date(a.createdAt), 'MMM yy')
          annByMonth[key] = (annByMonth[key] ?? 0) + 1
        })
      }
      setAnnouncementActivity(Object.entries(annByMonth).slice(-8).map(([month, count]) => ({ month, count })))
    }).finally(() => setLoading(false))
  }, [])

  const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="card">
      <h2 className="text-sm font-semibold text-surface-200 mb-4">{title}</h2>
      {loading ? <Skeleton className="h-48 w-full" /> : children}
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader title="Analytics" description="Visual overview of section activity and finances." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Income vs Expenses */}
        <ChartCard title="Monthly Income vs Expenses">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyFinance}>
              <defs>
                <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71717a' }} />
              <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#gInc)" strokeWidth={2} name="Income" />
              <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#gExp)" strokeWidth={2} name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Balance trend */}
        <ChartCard title="Balance Trend">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyFinance}>
              <defs>
                <linearGradient id="gBal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7458bd" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7458bd" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71717a' }} />
              <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="balance" stroke="#7458bd" fill="url(#gBal)" strokeWidth={2} name="Balance" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Expense categories */}
        <ChartCard title="Expense by Category">
          {expenseByCategory.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-surface-500 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={expenseByCategory} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {expenseByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Audit completion */}
        <ChartCard title="Audit Status Breakdown">
          {auditCompletion.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-surface-500 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={auditCompletion} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name">
                  {auditCompletion.map((entry, i) => (
                    <Cell key={i} fill={
                      entry.name === 'approved' ? '#10b981' :
                      entry.name === 'pending' ? '#f59e0b' :
                      entry.name === 'rejected' ? '#ef4444' :
                      entry.name === 'flagged' ? '#eab308' :
                      COLORS[i % COLORS.length]
                    } />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Event frequency */}
        <ChartCard title="Event Frequency">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={eventFreq}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71717a' }} />
              <YAxis tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="events" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Events" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Announcement activity */}
        <ChartCard title="Announcement Activity">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={announcementActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71717a' }} />
              <YAxis tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="count" fill="#7458bd" radius={[4, 4, 0, 0]} name="Announcements" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </motion.div>
  )
}
