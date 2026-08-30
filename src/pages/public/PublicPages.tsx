import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Image as ImageIcon, Clock, Users, Info, X, ChevronLeft, ChevronRight, LayoutGrid, MapPin, Link2, Check, Search } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isSameMonth, isToday, addMonths, subMonths,
  startOfWeek, endOfWeek
} from 'date-fns'
import { dbGet } from '@/lib/firebase'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { EmptyState, Skeleton, Modal } from '@/components/ui'
import { AnthemEmbed } from '@/components/AnthemEmbed'
import { PhotoLightbox } from '@/components/PhotoLightbox'
import { DownloadAllButton } from '@/components/DownloadAllButton'

interface Event {
  id: string
  title: string
  description: string
  coverImage?: string
  date: number
  location?: string
  tags?: string[]
  galleryIds?: string[]
}

interface GalleryImage {
  id: string
  url: string
  caption?: string
  eventId?: string
  eventTitle?: string
  uploadedAt: number
}

interface Officer {
  id: string
  name: string
  position: string
  photoUrl?: string
  email?: string
  bio?: string
  order?: number
}

// ─── Events ──────────────────────────────────────────────────────────────────

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Shares/copies a link to an event's detail page. Resolves after a native share, or once the link is on the clipboard. */
async function shareEvent(event: Pick<Event, 'id' | 'title' | 'description'>): Promise<'shared' | 'copied'> {
  const url = `${window.location.origin}${window.location.pathname}#/events/${event.id}`
  if (navigator.share) {
    try {
      await navigator.share({ title: event.title, text: event.description?.slice(0, 120), url })
      return 'shared'
    } catch {
      // user cancelled or not supported — fall through to clipboard
    }
  }
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    const el = document.createElement('input')
    el.value = url
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
  return 'copied'
}

function EventsCalendar({ events }: { events: Event[] }) {
  const [current, setCurrent] = useState(new Date())
  const [selected, setSelected] = useState<Date | null>(null)
  const [detailEvent, setDetailEvent] = useState<Event | null>(null)
  const [copied, setCopied] = useState(false)
  const [galleryByEvent, setGalleryByEvent] = useState<Record<string, GalleryImage[]>>({})

  useEffect(() => {
    dbGet<Record<string, GalleryImage>>('gallery').then((data) => {
      if (!data) return
      const grouped: Record<string, GalleryImage[]> = {}
      Object.entries(data).forEach(([id, v]) => {
        if (!v.eventId) return
        const img = { ...v, id }
        grouped[v.eventId] = [...(grouped[v.eventId] ?? []), img]
      })
      setGalleryByEvent(grouped)
    })
  }, [])

  async function handleShare(event: Event) {
    const result = await shareEvent(event)
    if (result === 'copied') {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  function getEventsForDay(day: Date) {
    return events.filter((e) => isSameDay(new Date(e.date), day))
  }

  const selectedDayEvents = selected ? getEventsForDay(selected) : []

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      {/* Calendar */}
      <div className="xl:col-span-3 card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800/60">
          <button
            onClick={() => setCurrent((d) => subMonths(d, 1))}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <motion.h2
            key={format(current, 'MMM yyyy')}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-surface-100 font-semibold"
          >
            {format(current, 'MMMM yyyy')}
          </motion.h2>
          <button
            onClick={() => setCurrent((d) => addMonths(d, 1))}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-surface-800/60">
          {DOW.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-surface-500 py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayEvents = getEventsForDay(day)
            const isCurrentMonth = isSameMonth(day, current)
            const isSelected = selected && isSameDay(day, selected)
            const isTodayDay = isToday(day)

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelected(isSameDay(day, selected ?? new Date(0)) ? null : day)}
                className={cn(
                  'relative min-h-[72px] p-2 text-left border-b border-r border-surface-800/30 transition-all',
                  !isCurrentMonth && 'opacity-30',
                  isSelected && 'bg-brand-600/10',
                  !isSelected && 'hover:bg-surface-800/30'
                )}
              >
                <span className={cn(
                  'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                  isTodayDay ? 'bg-brand-500 text-white' : 'text-surface-400'
                )}>
                  {format(day, 'd')}
                </span>
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {dayEvents.slice(0, 3).map((e) => (
                    <span key={e.id} className="inline-block w-1.5 h-1.5 rounded-full bg-brand-400" />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[9px] text-surface-500">+{dayEvents.length - 3}</span>
                  )}
                </div>
                {dayEvents.length > 0 && (
                  <div className="hidden sm:block mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((e) => (
                      <p key={e.id} className="text-[10px] leading-tight truncate px-1 py-0.5 rounded bg-brand-100 text-brand-700">
                        {e.title}
                      </p>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="card p-0 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800/60">
                <p className="text-sm font-semibold text-surface-200">{format(selected, 'MMM dd, yyyy')}</p>
                <button onClick={() => setSelected(null)} className="text-surface-600 hover:text-surface-300 transition-colors">
                  <X size={14} />
                </button>
              </div>
              {selectedDayEvents.length === 0 ? (
                <p className="text-center text-surface-500 text-sm py-6">Nothing scheduled</p>
              ) : (
                <div className="divide-y divide-surface-800/40">
                  {selectedDayEvents.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setDetailEvent(e)}
                      className="w-full text-left px-4 py-3 hover:bg-surface-800/30 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-brand-400" />
                        <div className="min-w-0">
                          <p className="text-sm text-surface-100 font-medium truncate">{e.title}</p>
                          {e.location && <p className="text-xs text-surface-500 truncate">{e.location}</p>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="card py-3">
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Legend</p>
          <div className="flex items-center gap-2 text-sm text-surface-300">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-400" /> Events
          </div>
        </div>
      </div>

      {/* Detail modal */}
      <Modal
        open={!!detailEvent}
        onClose={() => { setDetailEvent(null); setCopied(false) }}
        title={detailEvent?.title ?? ''}
        size="md"
      >
        {detailEvent && (
          <div className="space-y-3">
            {detailEvent.coverImage && (
              <div className="h-40 rounded-xl overflow-hidden">
                <img src={detailEvent.coverImage} alt={detailEvent.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <p className="text-surface-500 text-sm flex items-center gap-1"><Calendar size={12} />{formatDate(detailEvent.date)}</p>
              <button
                onClick={() => handleShare(detailEvent)}
                className="flex items-center gap-1.5 text-xs font-medium text-surface-400 hover:text-surface-100 transition-colors"
                title="Share this event"
              >
                {copied ? (
                  <><Check size={12} className="text-green-400" /><span className="text-green-400">Copied!</span></>
                ) : (
                  <><Link2 size={12} /><span>Share</span></>
                )}
              </button>
            </div>
            {detailEvent.location && (
              <p className="text-surface-400 text-sm flex items-center gap-1"><MapPin size={12} />{detailEvent.location}</p>
            )}
            {detailEvent.description && (
              <p className="text-surface-300 text-sm leading-relaxed">{detailEvent.description}</p>
            )}
            {detailEvent.tags && detailEvent.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {detailEvent.tags.map((tag) => (
                  <span key={tag} className="badge-gray text-xs">{tag}</span>
                ))}
              </div>
            )}
            {(galleryByEvent[detailEvent.id]?.length ?? 0) > 0 && (
              <div className="flex gap-1.5">
                {galleryByEvent[detailEvent.id].slice(0, 4).map((photo) => (
                  <div key={photo.id} className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                {galleryByEvent[detailEvent.id].length > 4 && (
                  <div className="w-12 h-12 rounded-lg bg-surface-800 flex items-center justify-center text-xs text-surface-400 flex-shrink-0">
                    +{galleryByEvent[detailEvent.id].length - 4}
                  </div>
                )}
              </div>
            )}
            <div className="pt-1">
              <Link
                to={`/events/${detailEvent.id}`}
                onClick={() => { setDetailEvent(null); setCopied(false) }}
                className="text-xs font-medium text-brand-600 hover:text-brand-500 transition-colors"
              >
                View full details →
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export function Events() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [timeFilter, setTimeFilter] = useState<'upcoming' | 'past'>('upcoming')

  async function handleShareCard(e: React.MouseEvent, event: Event) {
    e.preventDefault()
    e.stopPropagation()
    const result = await shareEvent(event)
    if (result === 'copied') {
      setCopiedId(event.id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  useEffect(() => {
    dbGet<Record<string, Event>>('events').then((data) => {
      if (data) {
        setEvents(
          Object.entries(data)
            .map(([id, v]) => ({ ...v, id }))
            .sort((a, b) => b.date - a.date)
        )
      }
    }).finally(() => setLoading(false))
  }, [])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    events.forEach((e) => e.tags?.forEach((t) => set.add(t)))
    return Array.from(set).sort()
  }, [events])

  function toggleTag(tag: string) {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const searchedEvents = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events.filter((e) => {
      const matchesQuery = !q || e.title.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q)
      const matchesTags = activeTags.length === 0 || activeTags.every((t) => e.tags?.includes(t))
      return matchesQuery && matchesTags
    })
  }, [events, query, activeTags])

  const [now] = useState(() => Date.now())
  const upcomingEvents = useMemo(
    () => searchedEvents.filter((e) => e.date >= now).sort((a, b) => a.date - b.date),
    [searchedEvents, now]
  )
  const pastEvents = useMemo(
    () => searchedEvents.filter((e) => e.date < now).sort((a, b) => b.date - a.date),
    [searchedEvents, now]
  )
  const listEvents = timeFilter === 'upcoming' ? upcomingEvents : pastEvents

  const calendarEvents = useMemo(() => [...searchedEvents].sort((a, b) => a.date - b.date), [searchedEvents])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gold-500/20 flex items-center justify-center">
              <Calendar size={16} className="text-gold-700" />
            </div>
            <h1 className="text-2xl font-bold text-surface-100">Events</h1>
          </div>

          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-surface-800/50 border border-surface-800/60">
            <button
              onClick={() => setView('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                view === 'list' ? 'bg-brand-600 text-white' : 'text-surface-400 hover:text-surface-100'
              )}
            >
              <LayoutGrid size={13} /> List
            </button>
            <button
              onClick={() => setView('calendar')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                view === 'calendar' ? 'bg-brand-600 text-white' : 'text-surface-400 hover:text-surface-100'
              )}
            >
              <Calendar size={13} /> Calendar
            </button>
          </div>
        </div>
        <p className="text-surface-500 text-sm mb-8">A record of every section activity and gathering.</p>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events…"
            className="input pl-10"
          />
        </div>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-full border transition-colors',
                  activeTags.includes(tag)
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'border-surface-700 text-surface-400 hover:text-surface-100 hover:border-surface-500'
                )}
              >
                {tag}
              </button>
            ))}
            {activeTags.length > 0 && (
              <button
                onClick={() => setActiveTags([])}
                className="text-xs px-2.5 py-1 rounded-full text-surface-500 hover:text-surface-200 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Upcoming / Past */}
        {view === 'list' && (
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-surface-800/50 border border-surface-800/60 mb-6">
            <button
              onClick={() => setTimeFilter('upcoming')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                timeFilter === 'upcoming' ? 'bg-brand-600 text-white' : 'text-surface-400 hover:text-surface-100'
              )}
            >
              Upcoming ({upcomingEvents.length})
            </button>
            <button
              onClick={() => setTimeFilter('past')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                timeFilter === 'past' ? 'bg-brand-600 text-white' : 'text-surface-400 hover:text-surface-100'
              )}
            >
              Past ({pastEvents.length})
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card">
                <Skeleton className="h-40 mb-4" />
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <EmptyState icon={Calendar} title="No events yet" description="Events will appear here as they are added." />
        ) : view === 'calendar' ? (
          calendarEvents.length === 0 ? (
            <EmptyState icon={Calendar} title="No matching events" description="Try a different search term or tag." />
          ) : (
            <EventsCalendar events={calendarEvents} />
          )
        ) : listEvents.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={timeFilter === 'upcoming' ? 'No upcoming events' : 'No past events'}
            description={query || activeTags.length > 0 ? 'Try a different search term or tag.' : timeFilter === 'upcoming' ? 'Check back soon for what\'s next.' : 'Nothing has happened yet.'}
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {listEvents.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/events/${event.id}`} className="card-hover p-0 overflow-hidden group block">
                  {event.coverImage ? (
                    <div className="h-44 overflow-hidden">
                      <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  ) : (
                    <div className="h-44 bg-gradient-to-br from-brand-900/50 to-surface-800/50 flex items-center justify-center">
                      <Calendar size={32} className="text-surface-600" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {event.tags?.map((tag) => (
                        <span key={tag} className="badge-gray text-xs">{tag}</span>
                      ))}
                    </div>
                    <h2 className="font-semibold text-surface-100 mb-1">{event.title}</h2>
                    <p className="text-surface-400 text-sm line-clamp-2 mb-3">{event.description}</p>
                    <div className="flex items-center justify-between text-xs text-surface-500">
                      <span className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(event.date)}</span>
                        {event.location && <span>· {event.location}</span>}
                      </span>
                      <button
                        onClick={(e) => handleShareCard(e, event)}
                        className="flex items-center gap-1 text-surface-500 hover:text-surface-200 transition-colors"
                        title="Copy link"
                      >
                        {copiedId === event.id ? (
                          <><Check size={11} className="text-green-400" /><span className="text-green-400">Copied!</span></>
                        ) : (
                          <><Link2 size={11} /><span>Share</span></>
                        )}
                      </button>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Gallery ─────────────────────────────────────────────────────────────────

export function Gallery() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [images, setImages] = useState<GalleryImage[]>([])
  const [events, setEvents] = useState<{ id: string; title: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [eventFilter, setEventFilter] = useState<string>(() => searchParams.get('event') ?? '')

  useEffect(() => {
    Promise.all([
      dbGet<Record<string, GalleryImage>>('gallery'),
      dbGet<Record<string, { title: string }>>('events'),
    ]).then(([data, evData]) => {
      if (data) {
        setImages(
          Object.entries(data)
            .map(([id, v]) => ({ ...v, id }))
            .sort((a, b) => b.uploadedAt - a.uploadedAt)
        )
      }
      if (evData) {
        setEvents(Object.entries(evData).map(([id, v]) => ({ id, title: v.title })))
      }
    }).finally(() => setLoading(false))
  }, [])

  const filteredImages = useMemo(
    () => (eventFilter ? images.filter((img) => img.eventId === eventFilter) : images),
    [images, eventFilter]
  )

  // Event tabs — only show events that actually have photos.
  const eventTabs = useMemo(() => {
    const idsWithPhotos = new Set(images.map((img) => img.eventId).filter(Boolean))
    return events.filter((e) => idsWithPhotos.has(e.id))
  }, [images, events])

  function selectEvent(id: string) {
    setEventFilter(id)
    setLightbox(null)
    const next = new URLSearchParams(searchParams)
    if (id) next.set('event', id)
    else next.delete('event')
    next.delete('photo')
    setSearchParams(next, { replace: true })
  }

  // Deep-link straight into a shared photo (?photo=<id>), once images are loaded.
  useEffect(() => {
    if (loading) return
    const photoId = searchParams.get('photo')
    if (!photoId) return
    const pool = eventFilter ? filteredImages : images
    const idx = pool.findIndex((img) => img.id === photoId)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration of the lightbox from the URL, not derived render state
    if (idx !== -1) setLightbox(idx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  function openLightbox(i: number) {
    setLightbox(i)
    const next = new URLSearchParams(searchParams)
    next.set('photo', filteredImages[i].id)
    setSearchParams(next, { replace: true })
  }

  function changeLightbox(i: number) {
    setLightbox(i)
    const next = new URLSearchParams(searchParams)
    next.set('photo', filteredImages[i].id)
    setSearchParams(next, { replace: true })
  }

  function closeLightbox() {
    setLightbox(null)
    const next = new URLSearchParams(searchParams)
    next.delete('photo')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <ImageIcon size={16} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100">Gallery</h1>
        </div>
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <p className="text-surface-500 text-sm">Memories captured from every section event.</p>
          <div className="flex items-center gap-2 flex-wrap">
            {filteredImages.length > 0 && (
              <DownloadAllButton
                photos={filteredImages}
                zipFilename={
                  eventFilter
                    ? `${(eventTabs.find((e) => e.id === eventFilter)?.title ?? 'event').replace(/[^\w\- ]+/g, '').trim() || 'event'}-photos.zip`
                    : 'gallery-photos.zip'
                }
              />
            )}
            <Link to="/share-photos" className="btn-secondary text-xs gap-1.5 shrink-0">
              <ImageIcon size={13} />
              Share your photos
            </Link>
          </div>
        </div>

        {/* Per-event filter tabs */}
        {!loading && eventTabs.length > 0 && (
          <div className="flex items-center gap-2 mb-8 flex-wrap">
            <button
              onClick={() => selectEvent('')}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                !eventFilter
                  ? 'border-brand-600 bg-brand-600/15 text-brand-500'
                  : 'border-surface-700 text-surface-400 hover:border-surface-500 hover:bg-surface-800'
              )}
            >
              All events
            </button>
            {eventTabs.map((ev) => (
              <button
                key={ev.id}
                onClick={() => selectEvent(ev.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  eventFilter === ev.id
                    ? 'border-brand-600 bg-brand-600/15 text-brand-500'
                    : 'border-surface-700 text-surface-400 hover:border-surface-500 hover:bg-surface-800'
                )}
              >
                {ev.title}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className={`w-full ${i % 3 === 0 ? 'h-48' : 'h-32'} break-inside-avoid`} />
            ))}
          </div>
        ) : filteredImages.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="No photos yet"
            description={eventFilter ? 'No photos for this event yet.' : 'Gallery images will appear here.'}
          />
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
            {filteredImages.map((img, i) => (
              <div
                key={img.id}
                onClick={() => openLightbox(i)}
                className="break-inside-avoid overflow-hidden rounded-xl cursor-pointer group"
              >
                <img
                  src={img.url}
                  alt={img.caption ?? ''}
                  loading="lazy"
                  className="w-full object-cover group-hover:scale-105 transition-transform duration-300 rounded-xl"
                />
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Lightbox — with per-photo share, likes, and comments */}
      <AnimatePresence>
        {lightbox !== null && filteredImages[lightbox] && (
          <PhotoLightbox
            photos={filteredImages}
            index={lightbox}
            onClose={closeLightbox}
            onIndexChange={changeLightbox}
            buildShareUrl={(photo) => `${window.location.origin}/gallery?photo=${photo.id}`}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

interface TimelineEntry {
  id: string
  title: string
  description: string
  date: number
  location?: string
  coverImage?: string
}

export function Timeline() {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dbGet<Record<string, TimelineEntry>>('timeline').then((data) => {
      if (data) {
        setEntries(
          Object.entries(data)
            .map(([id, v]) => ({ ...v, id }))
            .sort((a, b) => b.date - a.date)
        )
      }
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center">
            <Clock size={16} className="text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100">Timeline</h1>
        </div>
        <p className="text-surface-500 text-sm mb-12">The story of our section, from beginning to now.</p>

        {loading ? (
          <div className="space-y-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <Skeleton className="w-4 h-4 rounded-full" />
                  <div className="w-0.5 flex-1 bg-surface-800/60 mt-2" />
                </div>
                <div className="flex-1 pb-8">
                  <Skeleton className="h-3 w-24 mb-2" />
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState icon={Clock} title="No timeline entries yet" description="Milestones will appear here as they are added." />
        ) : (
          <div className="relative">
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-600/60 via-surface-700 to-transparent" />
            <div className="space-y-0">
              {entries.map((entry, i) => (
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
                  <div className="flex-1 pb-10 min-w-0">
                    <p className="text-xs text-brand-600 font-mono mb-1">{formatDate(entry.date)}</p>
                    <h2 className="text-base font-semibold text-surface-100 mb-1 group-hover:text-brand-700 transition-colors">{entry.title}</h2>
                    <p className="text-surface-400 text-sm line-clamp-3">{entry.description}</p>
                    {entry.location && (
                      <p className="text-xs text-surface-500 mt-2">📍 {entry.location}</p>
                    )}
                    {entry.coverImage && (
                      <div className="mt-3 h-32 w-full sm:w-64 rounded-xl overflow-hidden">
                        <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Officer List ─────────────────────────────────────────────────────────────

export function OfficerList() {
  const [officers, setOfficers] = useState<Officer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dbGet<Record<string, Officer>>('officers').then((data) => {
      if (data) {
        setOfficers(
          Object.entries(data)
            .map(([id, v]) => ({ ...v, id }))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        )
      }
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center">
            <Users size={16} className="text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100">Our Officers</h1>
        </div>
        <p className="text-surface-500 text-sm mb-8">The people serving our section.</p>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card text-center">
                <Skeleton className="w-20 h-20 rounded-full mx-auto mb-3" />
                <Skeleton className="h-5 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
            ))}
          </div>
        ) : officers.length === 0 ? (
          <EmptyState icon={Users} title="No officers listed" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {officers.map((officer, i) => (
              <motion.div
                key={officer.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card text-center group"
              >
                {officer.photoUrl ? (
                  <img
                    src={officer.photoUrl}
                    alt={officer.name}
                    className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-2 border-surface-700 group-hover:border-brand-600 transition-colors"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full mx-auto mb-3 bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-2xl font-bold text-white">
                    {officer.name[0]}
                  </div>
                )}
                <h2 className="font-semibold text-surface-100">{officer.name}</h2>
                <p className="text-sm text-brand-600 mt-1">{officer.position}</p>
                {officer.bio && (
                  <p className="text-xs text-surface-500 mt-2 leading-relaxed line-clamp-3">{officer.bio}</p>
                )}
                {officer.email && (
                  <a href={`mailto:${officer.email}`} className="text-xs text-surface-500 hover:text-surface-300 mt-2 block">
                    {officer.email}
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── About ────────────────────────────────────────────────────────────────────

export function About() {
  const [settings, setSettings] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dbGet<Record<string, string>>('settings').then(setSettings).finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center">
            <Info size={16} className="text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100">About</h1>
        </div>
        <p className="text-surface-500 text-sm mb-8">Learn more about Section MATIPID.</p>

        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold text-surface-100 mb-3">Our Mission</h2>
            <p className="text-surface-400 text-sm leading-relaxed">
              {loading ? <Skeleton className="h-4 w-full" /> : (
                settings?.description ?? 'Section MATIPID is committed to transparency, accountability, and unity. We strive to create an environment where every student feels represented and every peso is accounted for.'
              )}
            </p>
          </div>

          <div className="card">
            <h2 className="font-semibold text-surface-100 mb-3">About This Platform</h2>
            <p className="text-surface-400 text-sm leading-relaxed mb-4">
              The MATIPID Portal is built to give every member of our section full visibility into how our section operates — from announcements to financial records. Powered by Firebase and deployed via GitHub Pages.
            </p>
            <div className="flex flex-wrap gap-2">
              {['React', 'TypeScript', 'Firebase', 'Cloudinary', 'GitHub Actions'].map((tech) => (
                <span key={tech} className="badge-gray">{tech}</span>
              ))}
            </div>
          </div>

          <AnthemEmbed />

          <div className="card">
            <h2 className="font-semibold text-surface-100 mb-3">Core Values</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: 'Transparency', desc: 'All financial records are public and auditable.' },
                { label: 'Accountability', desc: 'Every action is logged and attributed.' },
                { label: 'Recoverability', desc: 'All changes can be rolled back safely.' },
                { label: 'Simplicity', desc: 'Easy for students, powerful for officers.' },
              ].map((v) => (
                <div key={v.label} className="p-3 rounded-xl bg-surface-800/40">
                  <p className="text-sm font-medium text-brand-700 mb-1">{v.label}</p>
                  <p className="text-xs text-surface-500">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
