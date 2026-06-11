import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Megaphone, Pin, Search } from 'lucide-react'
import { dbGet } from '@/lib/firebase'
import { formatDate } from '@/lib/utils'
import { EmptyState, Skeleton } from '@/components/ui'

interface Announcement {
  id: string
  title: string
  content: string
  coverImage?: string
  author: string
  createdAt: number
  pinned?: boolean
}

export function Announcements() {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    dbGet<Record<string, Announcement>>('announcements').then((data) => {
      if (data) {
        const list = Object.entries(data)
          .map(([id, v]) => ({ ...v, id }))
          .sort((a, b) => {
            if (a.pinned && !b.pinned) return -1
            if (!a.pinned && b.pinned) return 1
            return b.createdAt - a.createdAt
          })
        setItems(list)
      }
    }).finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.content.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center">
            <Megaphone size={16} className="text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100">Announcements</h1>
        </div>
        <p className="text-surface-500 text-sm mb-8">Stay informed with the latest updates from your section.</p>

        {/* Search */}
        <div className="relative mb-8">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search announcements…"
            className="input pl-10"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card">
                <Skeleton className="h-4 w-3/4 mb-3" />
                <Skeleton className="h-3 w-full mb-1.5" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No announcements yet"
            description={query ? 'Try a different search term.' : 'Check back later for updates.'}
          />
        ) : (
          <div className="space-y-4">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-hover overflow-hidden"
              >
                <div className="flex gap-4">
                  {item.coverImage && (
                    <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden">
                      <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      {item.pinned && (
                        <span className="badge-gold flex-shrink-0">
                          <Pin size={10} /> Pinned
                        </span>
                      )}
                      <h2 className="font-semibold text-surface-100 leading-snug">{item.title}</h2>
                    </div>
                    <p className="text-surface-400 text-sm line-clamp-2 mb-3">{item.content}</p>
                    <div className="flex items-center gap-3 text-xs text-surface-500">
                      <span>{item.author}</span>
                      <span>·</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
