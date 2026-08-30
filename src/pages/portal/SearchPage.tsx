import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, Megaphone, Calendar, DollarSign, Image, ScrollText, ArrowRight } from 'lucide-react'
import { dbGet } from '@/lib/firebase'
import { formatDate, formatCurrency } from '@/lib/utils'
import { PageHeader } from '@/components/ui'

interface SearchResult {
  id: string
  type: 'announcement' | 'event' | 'transaction' | 'gallery' | 'log'
  title: string
  subtitle?: string
  meta?: string
  to?: string
}

const TYPE_CONFIG = {
  announcement: { icon: Megaphone, color: 'text-brand-600 bg-brand-600/10', label: 'Announcement' },
  event: { icon: Calendar, color: 'text-gold-700 bg-gold-500/10', label: 'Event' },
  transaction: { icon: DollarSign, color: 'text-emerald-600 bg-emerald-500/10', label: 'Transaction' },
  gallery: { icon: Image, color: 'text-brand-600 bg-brand-600/10', label: 'Gallery' },
  log: { icon: ScrollText, color: 'text-surface-400 bg-surface-800/50', label: 'Log' },
}

export function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [allData, setAllData] = useState<{
    announcements: Record<string, { title: string; content: string; author: string; createdAt: number }>
    events: Record<string, { title: string; description: string; date: number; location?: string }>
    transactions: Record<string, { title: string; amount: number; category: string; type: string; status: string; createdAt: number }>
    gallery: Record<string, { caption?: string; eventTitle?: string; uploadedAt: number }>
    logs: Record<string, { action: string; userEmail: string; targetResource: string; timestamp: number }>
  } | null>(null)
  const [loaded, setLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!loaded) {
      Promise.all([
        dbGet<Record<string, { title: string; content: string; author: string; createdAt: number }>>('announcements'),
        dbGet<Record<string, { title: string; description: string; date: number; location?: string }>>('events'),
        dbGet<Record<string, { title: string; amount: number; category: string; type: string; status: string; createdAt: number }>>('transactions'),
        dbGet<Record<string, { caption?: string; eventTitle?: string; uploadedAt: number }>>('gallery'),
        dbGet<Record<string, { action: string; userEmail: string; targetResource: string; timestamp: number }>>('logs'),
      ]).then(([announcements, events, transactions, gallery, logs]) => {
        setAllData({
          announcements: announcements ?? {},
          events: events ?? {},
          transactions: transactions ?? {},
          gallery: gallery ?? {},
          logs: logs ?? {},
        })
        setLoaded(true)
      })
    }
  }, [loaded])

  useEffect(() => {
    if (!query.trim() || !allData) {
      setResults([])
      return
    }

    setSearching(true)
    const q = query.toLowerCase()
    const found: SearchResult[] = []

    // Announcements
    Object.entries(allData.announcements).forEach(([id, a]) => {
      if (a.title?.toLowerCase().includes(q) || a.content?.toLowerCase().includes(q) || a.author?.toLowerCase().includes(q)) {
        found.push({ id, type: 'announcement', title: a.title, subtitle: a.content?.slice(0, 80), meta: formatDate(a.createdAt), to: '/announcements' })
      }
    })

    // Events
    Object.entries(allData.events).forEach(([id, e]) => {
      if (e.title?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q)) {
        found.push({ id, type: 'event', title: e.title, subtitle: e.description?.slice(0, 80), meta: formatDate(e.date), to: `/events/${id}` })
      }
    })

    // Transactions
    Object.entries(allData.transactions).forEach(([id, t]) => {
      if (t.title?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q)) {
        found.push({
          id,
          type: 'transaction',
          title: t.title,
          subtitle: `${t.type} · ${t.category} · ${t.status}`,
          meta: formatCurrency(t.amount),
          to: '/portal/finance',
        })
      }
    })

    // Gallery
    Object.entries(allData.gallery).forEach(([id, g]) => {
      if ((g.caption ?? '').toLowerCase().includes(q) || (g.eventTitle ?? '').toLowerCase().includes(q)) {
        found.push({ id, type: 'gallery', title: g.caption ?? 'Gallery Image', subtitle: g.eventTitle, meta: formatDate(g.uploadedAt), to: '/gallery' })
      }
    })

    // Logs
    Object.entries(allData.logs).forEach(([id, l]) => {
      if (l.action?.toLowerCase().includes(q) || l.userEmail?.toLowerCase().includes(q) || l.targetResource?.toLowerCase().includes(q)) {
        found.push({ id, type: 'log', title: l.action, subtitle: `${l.userEmail} · ${l.targetResource}`, meta: formatDate(l.timestamp), to: '/portal/logs' })
      }
    })

    setResults(found.slice(0, 50))
    setSearching(false)
  }, [query, allData])

  const grouped = results.reduce((groups, r) => {
    if (!groups[r.type]) groups[r.type] = []
    groups[r.type].push(r)
    return groups
  }, {} as Record<string, SearchResult[]>)

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader title="Search" description="Find anything across the entire platform." />

      {/* Search input */}
      <div className="relative mb-8">
        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search announcements, events, transactions, logs…"
          className="input pl-12 py-3.5 text-base"
          autoComplete="off"
        />
        {!loaded && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {query && (
          <motion.div
            key={query}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {results.length === 0 && !searching ? (
              <div className="text-center py-16">
                <SearchIcon size={32} className="text-surface-700 mx-auto mb-3" />
                <p className="text-surface-400">No results for "<span className="text-surface-200">{query}</span>"</p>
                <p className="text-surface-600 text-sm mt-1">Try different keywords.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-xs text-surface-500">{results.length} result{results.length !== 1 ? 's' : ''} for "{query}"</p>

                {(Object.entries(grouped) as [keyof typeof TYPE_CONFIG, SearchResult[]][]).map(([type, items]) => {
                  const cfg = TYPE_CONFIG[type]
                  return (
                    <div key={type}>
                      <h2 className="text-xs uppercase tracking-widest text-surface-500 mb-2 flex items-center gap-2">
                        <cfg.icon size={12} />
                        {cfg.label}s ({items.length})
                      </h2>
                      <div className="space-y-1.5">
                        {items.map((r) => (
                          <Link
                            key={r.id}
                            to={r.to ?? '#'}
                            className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800/50 transition-all group"
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                              <cfg.icon size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-surface-100 truncate group-hover:text-brand-700 transition-colors">{r.title}</p>
                              {r.subtitle && <p className="text-xs text-surface-500 truncate">{r.subtitle}</p>}
                            </div>
                            {r.meta && <p className="text-xs text-surface-600 flex-shrink-0">{r.meta}</p>}
                            <ArrowRight size={12} className="text-surface-600 group-hover:text-brand-600 transition-colors flex-shrink-0" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!query && (
        <div className="text-center py-16">
          <SearchIcon size={40} className="text-surface-800 mx-auto mb-4" />
          <p className="text-surface-500">Start typing to search across all content</p>
          <p className="text-surface-700 text-sm mt-2">Announcements · Events · Transactions · Gallery · Logs</p>
        </div>
      )}
    </motion.div>
  )
}
