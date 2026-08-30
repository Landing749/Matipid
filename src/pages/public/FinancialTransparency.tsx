import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, TrendingUp, TrendingDown, DollarSign, Clock, CheckCircle2 } from 'lucide-react'
import { dbGet } from '@/lib/firebase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Skeleton, StatusBadge, EmptyState } from '@/components/ui'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'

interface Transaction {
  id: string
  type: 'income' | 'expense'
  title: string
  description?: string
  amount: number
  category: string
  receiptUrl?: string
  createdBy: string
  createdAt: number
  status: string
}

export function FinancialTransparency() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dbGet<Record<string, Transaction>>('transactions').then((data) => {
      if (data) {
        const list = Object.entries(data)
          .map(([id, v]) => ({ ...v, id }))
          .filter((t) => t.status !== 'archived')
          .sort((a, b) => b.createdAt - a.createdAt)
        setTransactions(list)
      }
    }).finally(() => setLoading(false))
  }, [])

  const income = transactions.filter((t) => t.type === 'income' && t.status === 'approved').reduce((s, t) => s + t.amount, 0)
  const expenses = transactions.filter((t) => t.type === 'expense' && t.status === 'approved').reduce((s, t) => s + t.amount, 0)
  const balance = income - expenses
  const pending = transactions.filter((t) => t.status === 'pending').length

  // Monthly chart data
  const monthlyData = (() => {
    const months: Record<string, { month: string; income: number; expenses: number }> = {}
    transactions.forEach((t) => {
      const key = format(new Date(t.createdAt), 'MMM yyyy')
      if (!months[key]) months[key] = { month: key, income: 0, expenses: 0 }
      if (t.type === 'income' && t.status === 'approved') months[key].income += t.amount
      if (t.type === 'expense' && t.status === 'approved') months[key].expenses += t.amount
    })
    return Object.values(months).slice(-6)
  })()

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-gold-500/20 flex items-center justify-center">
            <Shield size={16} className="text-gold-700" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100">Financial Transparency</h1>
        </div>
        <p className="text-surface-500 text-sm mb-8">
          Every peso is accounted for. All financial records are reviewed by our independent auditor.
        </p>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Current Balance', value: formatCurrency(balance), icon: DollarSign, color: 'gold' },
            { label: 'Total Income', value: formatCurrency(income), icon: TrendingUp, color: 'green' },
            { label: 'Total Expenses', value: formatCurrency(expenses), icon: TrendingDown, color: 'red' },
            { label: 'Pending Audits', value: String(pending), icon: Clock, color: 'brand' },
          ].map((stat) => (
            <div key={stat.label} className="card">
              {loading ? (
                <>
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-7 w-28" />
                </>
              ) : (
                <>
                  <stat.icon size={16} className={`mb-2 ${stat.color === 'gold' ? 'text-gold-700' : stat.color === 'green' ? 'text-emerald-600' : stat.color === 'red' ? 'text-red-600' : 'text-brand-600'}`} />
                  <p className="text-lg font-bold text-surface-100">{stat.value}</p>
                  <p className="text-xs text-surface-500 mt-1">{stat.label}</p>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Chart */}
        {monthlyData.length > 0 && (
          <div className="card mb-8">
            <h2 className="text-sm font-semibold text-surface-200 mb-4">Monthly Summary</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71717a' }} />
                <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                  labelStyle={{ color: '#f4f4f5' }}
                />
                <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} name="Income" />
                <Area type="monotone" dataKey="expenses" stroke="#f59e0b" fill="url(#expGrad)" strokeWidth={2} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Transaction table */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-800/60">
            <h2 className="text-sm font-semibold text-surface-200">Transaction Records</h2>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState icon={DollarSign} title="No transactions yet" />
          ) : (
            <div className="divide-y divide-surface-800/60">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-800/20 transition-colors">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    t.type === 'income' ? 'bg-emerald-500/15' : 'bg-red-500/15'
                  }`}>
                    {t.type === 'income'
                      ? <TrendingUp size={14} className="text-emerald-600" />
                      : <TrendingDown size={14} className="text-red-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-100 truncate">{t.title}</p>
                    <p className="text-xs text-surface-500">{t.category} · {formatDate(t.createdAt)}</p>
                  </div>
                  <StatusBadge status={t.status} />
                  <p className={`text-sm font-semibold tabular-nums ${
                    t.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </p>
                  {t.receiptUrl && (
                    <a href={t.receiptUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:text-brand-700 text-xs">
                      Receipt
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
