import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { format, startOfWeek, isSameWeek, isSameMonth, isSameYear } from 'date-fns'
import { cn } from '@/lib/utils'

export interface SpotlightPhoto {
  id: string
  url: string
  caption?: string
  eventTitle?: string
  uploadedAt: number
}

const TABS = ['week', 'month', 'year'] as const
type Tab = (typeof TABS)[number]
const LABELS: Record<Tab, string> = { week: 'This Week', month: 'This Month', year: 'This Year' }

/** Small, deterministic string hash — same input always gives the same output. */
function hashStr(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * Picks a stable "winner" from a pool for a given period key. Every photo's
 * score is a hash of (period + photo id), so the same photo wins for
 * everyone all period long, and the pick naturally rotates once the period
 * key changes — no manual curation needed.
 */
function pickForPeriod(pool: SpotlightPhoto[], seed: string): SpotlightPhoto | null {
  if (pool.length === 0) return null
  let best = pool[0]
  let bestScore = -1
  for (const p of pool) {
    const score = hashStr(`${seed}:${p.id}`)
    if (score > bestScore) {
      bestScore = score
      best = p
    }
  }
  return best
}

/**
 * Featured-photo banner with Week/Month/Year tabs. Draws from the full,
 * unfiltered photo pool so it stays populated regardless of any event
 * filter the visitor has applied to the grid/carousel below.
 */
export function PhotoSpotlight({
  photos,
  onOpen,
}: {
  photos: SpotlightPhoto[]
  onOpen: (photo: SpotlightPhoto) => void
}) {
  const [tab, setTab] = useState<Tab>('week')

  const picks = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekPool = photos.filter((p) => isSameWeek(p.uploadedAt, now, { weekStartsOn: 1 }))
    const monthPool = photos.filter((p) => isSameMonth(p.uploadedAt, now))
    const yearPool = photos.filter((p) => isSameYear(p.uploadedAt, now))
    return {
      week: pickForPeriod(weekPool.length ? weekPool : photos, `week-${format(weekStart, 'yyyy-MM-dd')}`),
      month: pickForPeriod(monthPool.length ? monthPool : photos, `month-${format(now, 'yyyy-MM')}`),
      year: pickForPeriod(yearPool.length ? yearPool : photos, `year-${format(now, 'yyyy')}`),
    }
  }, [photos])

  const active = picks[tab]
  if (!active) return null

  return (
    <div className="mb-8 rounded-2xl border border-surface-800 bg-surface-900/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-surface-100">Photo Spotlight</h2>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-surface-950/60 border border-surface-800">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                tab === t ? 'bg-brand-600 text-white' : 'text-surface-400 hover:text-surface-100'
              )}
            >
              {LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.button
          key={`${tab}-${active.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onOpen(active)}
          className="relative block w-full mt-4 group text-left"
        >
          <div className="aspect-[21/9] sm:aspect-[3/1] overflow-hidden">
            <img
              src={active.url}
              alt={active.caption ?? ''}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-surface-950/90 via-surface-950/10 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            {active.eventTitle && <p className="text-brand-400 text-xs font-medium">{active.eventTitle}</p>}
            {active.caption && <p className="text-surface-100 text-sm font-medium line-clamp-1">{active.caption}</p>}
          </div>
        </motion.button>
      </AnimatePresence>
    </div>
  )
}
