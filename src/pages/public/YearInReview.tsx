import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Calendar, Image as ImageIcon, DollarSign, Clock, Trophy,
  TrendingUp, TrendingDown, Landmark, Printer, Heart, Wallet, ChevronDown,
} from 'lucide-react'
import { format, getYear, eachMonthOfInterval } from 'date-fns'
import { dbGet } from '@/lib/firebase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Skeleton, EmptyState, StatusBadge, StatCard } from '@/components/ui'
import { PhotoLightbox, type LightboxPhoto } from '@/components/PhotoLightbox'
import { ExportButtons } from '@/components/ExportButtons'
import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

// ─── Types ──────────────────────────────────────────────────────────────────

interface EventItem {
  id: string
  title: string
  date: number
  location?: string
}

interface GalleryImage {
  id: string
  url: string
  caption?: string
  eventId?: string
  eventTitle?: string
  uploadedAt: number
}

interface TimelineEntry {
  id: string
  title: string
  description: string
  date: number
  location?: string
  coverImage?: string
}

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

const COLORS = ['#7458bd', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6', '#a855f7']

const tooltipStyle = {
  contentStyle: { background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: 12 },
  labelStyle: { color: '#f4f4f5' },
  itemStyle: { color: '#a1a1aa' },
}

function yearBounds(year: number) {
  return {
    start: new Date(year, 0, 1, 0, 0, 0, 0).getTime(),
    end: new Date(year, 11, 31, 23, 59, 59, 999).getTime(),
  }
}

function groupByCategory(list: Transaction[]) {
  const map: Record<string, number> = {}
  for (const t of list) map[t.category] = (map[t.category] ?? 0) + t.amount
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function YearInReview() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<EventItem[]>([])
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [photoLikes, setPhotoLikes] = useState<Record<string, number>>({})
  const [sectionName, setSectionName] = useState('Our Section')
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [lightbox, setLightbox] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      dbGet<Record<string, Omit<EventItem, 'id'>>>('events'),
      dbGet<Record<string, Omit<GalleryImage, 'id'>>>('gallery'),
      dbGet<Record<string, Omit<TimelineEntry, 'id'>>>('timeline'),
      dbGet<Record<string, Omit<Transaction, 'id'>>>('transactions'),
      dbGet<Record<string, Record<string, { count: number }>>>('reactions/photo'),
      dbGet<{ section?: string }>('settings'),
    ]).then(([evData, galData, tlData, txData, reactionData, settings]) => {
      const evList = evData ? Object.entries(evData).map(([id, v]) => ({ ...v, id })) : []
      const galList = galData ? Object.entries(galData).map(([id, v]) => ({ ...v, id })) : []
      const tlList = tlData ? Object.entries(tlData).map(([id, v]) => ({ ...v, id })) : []
      const txList = txData
        ? Object.entries(txData).map(([id, v]) => ({ ...v, id })).filter((t) => t.status !== 'archived')
        : []

      setEvents(evList)
      setGallery(galList)
      setTimeline(tlList)
      setTransactions(txList)
      if (settings?.section) setSectionName(settings.section)

      if (reactionData) {
        const likes: Record<string, number> = {}
        for (const [photoId, emojis] of Object.entries(reactionData)) {
          likes[photoId] = Object.values(emojis).reduce((sum, r) => sum + (r.count ?? 0), 0)
        }
        setPhotoLikes(likes)
      }

      // Default to the most recent year that actually has something in it,
      // so the recap opens on last year's wrap-up once a new year begins.
      const allYears = new Set<number>([
        ...evList.map((e) => getYear(e.date)),
        ...galList.map((g) => getYear(g.uploadedAt)),
        ...tlList.map((t) => getYear(t.date)),
        ...txList.map((t) => getYear(t.createdAt)),
      ])
      if (allYears.size > 0) setYear(Math.max(...allYears))
    }).finally(() => setLoading(false))
  }, [])

  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()])
    events.forEach((e) => years.add(getYear(e.date)))
    gallery.forEach((g) => years.add(getYear(g.uploadedAt)))
    timeline.forEach((t) => years.add(getYear(t.date)))
    transactions.forEach((t) => years.add(getYear(t.createdAt)))
    return Array.from(years).sort((a, b) => b - a)
  }, [events, gallery, timeline, transactions])

  const { start, end } = useMemo(() => yearBounds(year), [year])

  const yearEvents = useMemo(
    () => events.filter((e) => e.date >= start && e.date <= end).sort((a, b) => a.date - b.date),
    [events, start, end]
  )
  const yearGallery = useMemo(
    () => gallery.filter((g) => g.uploadedAt >= start && g.uploadedAt <= end),
    [gallery, start, end]
  )
  const yearTimeline = useMemo(
    () => timeline.filter((t) => t.date >= start && t.date <= end).sort((a, b) => a.date - b.date),
    [timeline, start, end]
  )
  const yearTransactions = useMemo(
    () => transactions.filter((t) => t.createdAt >= start && t.createdAt <= end).sort((a, b) => a.createdAt - b.createdAt),
    [transactions, start, end]
  )

  const topPhotos = useMemo(() => {
    return [...yearGallery]
      .map((img) => ({ ...img, likes: photoLikes[img.id] ?? 0 }))
      .sort((a, b) => b.likes - a.likes || b.uploadedAt - a.uploadedAt)
      .slice(0, 6)
  }, [yearGallery, photoLikes])

  // ─── Financials ─────────────────────────────────────────────────────────

  const openingBalance = useMemo(() => {
    return transactions
      .filter((t) => t.status === 'approved' && t.createdAt < start)
      .reduce((bal, t) => bal + (t.type === 'income' ? t.amount : -t.amount), 0)
  }, [transactions, start])

  const yearApproved = useMemo(
    () => yearTransactions.filter((t) => t.status === 'approved'),
    [yearTransactions]
  )
  const totalIncome = useMemo(
    () => yearApproved.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [yearApproved]
  )
  const totalExpenses = useMemo(
    () => yearApproved.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [yearApproved]
  )
  const netChange = totalIncome - totalExpenses
  const closingBalance = openingBalance + netChange

  const incomeByCategory = useMemo(
    () => groupByCategory(yearApproved.filter((t) => t.type === 'income')),
    [yearApproved]
  )
  const expensesByCategory = useMemo(
    () => groupByCategory(yearApproved.filter((t) => t.type === 'expense')),
    [yearApproved]
  )

  const monthlyData = useMemo(() => {
    const months = eachMonthOfInterval({ start: new Date(year, 0, 1), end: new Date(year, 11, 1) })
    return months.map((m) => {
      const key = format(m, 'MMM')
      const inMonth = yearApproved.filter(
        (t) => new Date(t.createdAt).getMonth() === m.getMonth()
      )
      return {
        month: key,
        income: inMonth.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expenses: inMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      }
    })
  }, [yearApproved, year])

  const ledgerRows = useMemo(() => {
    let running = openingBalance
    return yearTransactions.map((t) => {
      if (t.status === 'approved') running += t.type === 'income' ? t.amount : -t.amount
      return { ...t, balance: t.status === 'approved' ? running : null }
    })
  }, [yearTransactions, openingBalance])

  const lightboxPhotos: LightboxPhoto[] = topPhotos.map((p) => ({
    id: p.id, url: p.url, caption: p.caption, eventId: p.eventId, eventTitle: p.eventTitle,
  }))

  const hasAnyData = yearEvents.length > 0 || yearGallery.length > 0 || yearTimeline.length > 0 || yearTransactions.length > 0

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <style>{`
        @media print {
          header, footer, .no-print { display: none !important; }
          body, .bg-surface-950 { background: #fff !important; }
        }
      `}</style>

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-gold-500/20 flex items-center justify-center">
            <Sparkles size={16} className="text-gold-700" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100">{year} Year in Review</h1>
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-surface-500 text-sm max-w-xl">
            An auto-generated recap of everything {sectionName} accomplished in {year} — events, memories, milestones, and every peso raised.
          </p>
          {availableYears.length > 1 && (
            <div className="relative no-print">
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="appearance-none bg-surface-900 border border-surface-700 text-surface-100 text-sm font-medium rounded-full pl-4 pr-9 py-2 cursor-pointer hover:border-brand-500 transition-colors focus:outline-none"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-surface-500" />
            </div>
          )}
        </div>
      </motion.div>

      {!loading && !hasAnyData ? (
        <EmptyState icon={Sparkles} title={`Nothing recorded for ${year} yet`} description="Once events, photos, timeline entries, or transactions are added for this year, the recap will populate automatically." />
      ) : (
        <>
          {/* Headline stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <StatCard label="Events Held" value={yearEvents.length} icon={Calendar} color="brand" loading={loading} />
            <StatCard label="Funds Raised" value={formatCurrency(totalIncome)} icon={DollarSign} color="gold" loading={loading} />
            <StatCard label="Photos Shared" value={yearGallery.length} icon={ImageIcon} color="green" loading={loading} />
            <StatCard label="Milestones Logged" value={yearTimeline.length} icon={Clock} color="gray" loading={loading} />
          </div>

          {/* Top Photos */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center">
                <Trophy size={16} className="text-brand-600" />
              </div>
              <h2 className="text-lg font-bold text-surface-100">Top Photos of {year}</h2>
            </div>
            <p className="text-surface-500 text-sm mb-6">The most-loved shots from the gallery, ranked by reactions.</p>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
              </div>
            ) : topPhotos.length === 0 ? (
              <EmptyState icon={ImageIcon} title="No photos this year" description="Photos uploaded in this year will be ranked here." />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {topPhotos.map((photo, i) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setLightbox(i)}
                    className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption ?? ''}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
                    <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-gold-500 text-surface-950 text-[11px] font-bold flex items-center justify-center shadow">
                      #{i + 1}
                    </span>
                    {photo.likes > 0 && (
                      <span className="absolute bottom-2 right-2 flex items-center gap-1 text-[11px] font-semibold text-white">
                        <Heart size={11} className="fill-red-500 text-red-500" />
                        {photo.likes}
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Timeline highlights */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Clock size={16} className="text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-surface-100">Timeline Highlights</h2>
            </div>
            <p className="text-surface-500 text-sm mb-6">Milestones logged for {sectionName} in {year}.</p>

            {loading ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-6">
                    <Skeleton className="w-4 h-4 rounded-full" />
                    <div className="flex-1"><Skeleton className="h-4 w-40 mb-2" /><Skeleton className="h-3 w-full" /></div>
                  </div>
                ))}
              </div>
            ) : yearTimeline.length === 0 ? (
              <EmptyState icon={Clock} title="No timeline entries this year" description="Milestones logged in the timeline for this year will appear here." />
            ) : (
              <div className="relative max-w-2xl">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-600/60 via-surface-700 to-transparent" />
                <div className="space-y-0">
                  {yearTimeline.map((entry, i) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="flex gap-6 group"
                    >
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-5 h-5 rounded-full border-2 border-brand-600 bg-surface-950 group-hover:bg-brand-600 transition-colors z-10 mt-1" />
                        <div className="w-0.5 flex-1 bg-surface-800/40 mt-1" />
                      </div>
                      <div className="flex-1 pb-8 min-w-0">
                        <p className="text-xs text-brand-600 font-mono mb-1">{formatDate(entry.date)}</p>
                        <h3 className="text-base font-semibold text-surface-100 mb-1">{entry.title}</h3>
                        <p className="text-surface-400 text-sm line-clamp-2">{entry.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            <Link to="/timeline" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
              View the full timeline →
            </Link>
          </section>

          {/* ─── Full Financial Report ─────────────────────────────────── */}
          <section id="financial-report">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gold-500/20 flex items-center justify-center">
                  <Landmark size={16} className="text-gold-700" />
                </div>
                <h2 className="text-lg font-bold text-surface-100">Full Financial Report — {year}</h2>
              </div>
              <div className="flex items-center gap-2 no-print">
                <ExportButtons kind="finance" filters={{ status: 'approved', from: start, to: end }} />
                <button onClick={() => window.print()} className="btn-secondary text-xs gap-1.5 py-2">
                  <Printer size={13} />
                  Print
                </button>
              </div>
            </div>
            <p className="text-surface-500 text-sm mb-6">
              Complete, audited breakdown of every peso in and out of {sectionName}'s funds for {year}.
            </p>

            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard label={`Opening Balance (Jan 1, ${year})`} value={formatCurrency(openingBalance)} icon={Wallet} color="gray" loading={loading} />
              <StatCard label="Total Income" value={formatCurrency(totalIncome)} icon={TrendingUp} color="green" loading={loading} />
              <StatCard label="Total Expenses" value={formatCurrency(totalExpenses)} icon={TrendingDown} color="red" loading={loading} />
              <StatCard label={`Closing Balance (Dec 31, ${year})`} value={formatCurrency(closingBalance)} icon={DollarSign} color="gold" loading={loading} />
            </div>

            {/* Category breakdown */}
            {!loading && (incomeByCategory.length > 0 || expensesByCategory.length > 0) && (
              <div className="grid lg:grid-cols-2 gap-4 mb-8">
                <div className="card">
                  <h3 className="text-sm font-semibold text-surface-200 mb-4">Income by Category</h3>
                  {incomeByCategory.length === 0 ? (
                    <p className="text-xs text-surface-500 py-8 text-center">No income recorded.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={incomeByCategory} cx="50%" cy="50%" outerRadius={75} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                          {incomeByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip {...tooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="card">
                  <h3 className="text-sm font-semibold text-surface-200 mb-4">Expenses by Category</h3>
                  {expensesByCategory.length === 0 ? (
                    <p className="text-xs text-surface-500 py-8 text-center">No expenses recorded.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={expensesByCategory} cx="50%" cy="50%" outerRadius={75} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                          {expensesByCategory.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                        </Pie>
                        <Tooltip {...tooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}

            {/* Monthly trend */}
            <div className="card mb-8">
              <h3 className="text-sm font-semibold text-surface-200 mb-4">Monthly Income vs. Expenses</h3>
              {loading ? (
                <Skeleton className="h-[220px]" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="yirIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="yirExpGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71717a' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                    <Tooltip {...tooltipStyle} formatter={(v) => formatCurrency(Number(v))} />
                    <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#yirIncomeGrad)" strokeWidth={2} name="Income" />
                    <Area type="monotone" dataKey="expenses" stroke="#f59e0b" fill="url(#yirExpGrad)" strokeWidth={2} name="Expenses" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Full ledger */}
            <div className="card p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-800/60">
                <h3 className="text-sm font-semibold text-surface-200">Transaction Ledger — {year}</h3>
              </div>
              {loading ? (
                <div className="p-5 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : ledgerRows.length === 0 ? (
                <EmptyState icon={DollarSign} title="No transactions this year" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-surface-500 border-b border-surface-800/60">
                        <th className="px-5 py-3 font-medium">Date</th>
                        <th className="px-5 py-3 font-medium">Description</th>
                        <th className="px-5 py-3 font-medium">Category</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 font-medium text-right">Amount</th>
                        <th className="px-5 py-3 font-medium text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-800/60">
                      {ledgerRows.map((t) => (
                        <tr key={t.id} className="hover:bg-surface-800/20 transition-colors">
                          <td className="px-5 py-3 text-surface-400 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                          <td className="px-5 py-3 text-surface-100 font-medium">
                            {t.title}
                            {t.receiptUrl && (
                              <a href={t.receiptUrl} target="_blank" rel="noreferrer" className="ml-2 text-brand-600 hover:text-brand-700 text-xs no-print">
                                Receipt
                              </a>
                            )}
                          </td>
                          <td className="px-5 py-3 text-surface-500">{t.category}</td>
                          <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                          <td className={`px-5 py-3 text-right font-semibold tabular-nums ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-surface-300">
                            {t.balance !== null ? formatCurrency(t.balance) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Lightbox for top photos */}
      <AnimatePresence>
        {lightbox !== null && lightboxPhotos[lightbox] && (
          <PhotoLightbox
            photos={lightboxPhotos}
            index={lightbox}
            onClose={() => setLightbox(null)}
            onIndexChange={setLightbox}
            buildShareUrl={(photo) => `${window.location.origin}/gallery?photo=${photo.id}`}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
