import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, CalendarClock, MapPin, PartyPopper, X } from 'lucide-react'

export interface BannerEvent {
  id: string
  title: string
  date: number
  location?: string
  happeningNow: boolean
}

function countdownLabel(msLeft: number) {
  const clamped = Math.max(msLeft, 0)
  const days = Math.floor(clamped / 86_400_000)
  const hours = Math.floor((clamped % 86_400_000) / 3_600_000)
  const minutes = Math.floor((clamped % 3_600_000) / 60_000)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${Math.max(minutes, 1)}m`
}

/**
 * Floating "next event" banner shown above the Home hero. Ticks a live
 * countdown for upcoming events, or a pulsing "Happening Today" badge for
 * same-day events. Renders nothing when there's no event, the event has no
 * title, or the visitor has already dismissed this specific event's banner
 * — so it never shows an empty shell.
 */
export function EventBanner({
  event,
  dismissed,
  onDismiss,
}: {
  event: BannerEvent | null
  dismissed: boolean
  onDismiss: () => void
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!event || event.happeningNow) return
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [event])

  if (!event || !event.title) return null

  const msLeft = event.date - now
  const dateLabel = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(event.date)

  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: -12, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -12, height: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="px-3 sm:px-6 pt-3">
            <div className="max-w-6xl mx-auto relative">
              <Link
                to={`/events/${event.id}`}
                className="group flex items-center gap-3 rounded-3xl sm:rounded-full pl-3 pr-11 py-2.5 sm:py-2.5 shadow-clay-sm bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 hover:from-brand-600 hover:via-brand-500 hover:to-brand-400 transition-all"
              >
                {/* Icon tile */}
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                  {event.happeningNow
                    ? <PartyPopper size={15} className="text-white" />
                    : <CalendarClock size={15} className="text-white" />}
                </span>

                {/* Copy */}
                <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {event.happeningNow ? (
                    <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white flex-shrink-0">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                      </span>
                      Happening Today
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold uppercase tracking-wide text-white/85 flex-shrink-0">
                      Upcoming Event
                    </span>
                  )}
                  <span className="text-sm font-semibold text-white truncate">{event.title}</span>
                  {!event.happeningNow && (
                    <span className="text-xs text-white/80 flex-shrink-0">{dateLabel}</span>
                  )}
                  {event.location && (
                    <span className="hidden md:flex items-center gap-1 text-xs text-white/75 flex-shrink-0">
                      <MapPin size={11} /> {event.location}
                    </span>
                  )}
                </div>

                {/* Live countdown chip */}
                {!event.happeningNow && msLeft > 0 && (
                  <span className="flex-shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold tabular-nums text-white">
                    {countdownLabel(msLeft)}
                  </span>
                )}

                <ArrowRight size={14} className="hidden sm:block flex-shrink-0 text-white/80 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onDismiss()
                }}
                title="Dismiss"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
