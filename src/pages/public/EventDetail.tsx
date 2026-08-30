import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, ArrowLeft, MapPin, Check, Link2, Tag, Image as ImageIcon, X, ChevronLeft, ChevronRight, PartyPopper, CalendarPlus, CalendarDays } from 'lucide-react'
import { dbGet, dbIncrement, dbPush } from '@/lib/firebase'
import { formatDate, cn } from '@/lib/utils'
import { Skeleton, EmptyState } from '@/components/ui'
import { Reactions } from '@/components/Reactions'
import { Comments } from '@/components/Comments'

interface Event {
  id: string
  title: string
  description: string
  coverImage?: string
  date: number
  location?: string
  tags?: string[]
}

interface GalleryImage {
  id: string
  url: string
  caption?: string
  eventId?: string
  uploadedAt: number
}

// ─── Calendar links ─────────────────────────────────────────────────────────
// Events only carry a plain date (no time-of-day), so every calendar entry
// is built as an all-day event. End dates are exclusive per the iCal/Google
// convention, so we add one day to the start date for DTEND / the end param.

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** YYYYMMDD in the event's local calendar date (not shifted to UTC). */
function toDateStamp(date: Date) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function escapeICSText(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function buildGoogleCalendarUrl(event: Event) {
  const start = new Date(event.date)
  const end = addDays(start, 1)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toDateStamp(start)}/${toDateStamp(end)}`,
    details: event.description ?? '',
    location: event.location ?? '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function buildOutlookCalendarUrl(event: Event) {
  const start = new Date(event.date)
  const end = addDays(start, 1)
  const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: isoDate(start),
    enddt: isoDate(end),
    allday: 'true',
    body: event.description ?? '',
    location: event.location ?? '',
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

function buildICSFile(event: Event) {
  const start = new Date(event.date)
  const end = addDays(start, 1)
  const now = new Date()
  const stamp = `${toDateStamp(now)}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MATIPID Portal//Event//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@matipid-portal`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${toDateStamp(start)}`,
    `DTEND;VALUE=DATE:${toDateStamp(end)}`,
    `SUMMARY:${escapeICSText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeICSText(event.description)}` : '',
    event.location ? `LOCATION:${escapeICSText(event.location)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)
  return lines.join('\r\n')
}

function downloadICS(event: Event) {
  const blob = new Blob([buildICSFile(event)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${event.title.replace(/[^\w\- ]+/g, '').trim() || 'event'}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function AddToCalendar({ event }: { event: Event }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-surface-700 text-surface-400 hover:text-surface-100 hover:border-surface-500 hover:bg-surface-800 transition-all duration-200"
        title="Add to calendar"
      >
        <CalendarPlus size={13} />
        Add to calendar
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-0 top-full mt-2 w-52 rounded-xl border border-surface-800 bg-surface-900 shadow-xl overflow-hidden z-20"
        >
          <a
            href={buildGoogleCalendarUrl(event)}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-surface-300 hover:bg-surface-800/60 hover:text-surface-100 transition-colors"
          >
            <CalendarDays size={14} />
            Google Calendar
          </a>
          <a
            href={buildOutlookCalendarUrl(event)}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-surface-300 hover:bg-surface-800/60 hover:text-surface-100 transition-colors"
          >
            <CalendarDays size={14} />
            Outlook.com
          </a>
          <button
            onClick={() => { downloadICS(event); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-surface-300 hover:bg-surface-800/60 hover:text-surface-100 transition-colors text-left"
          >
            <CalendarDays size={14} />
            Apple / other (.ics)
          </button>
        </motion.div>
      )}
    </div>
  )
}

export function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<Event | null>(null)
  const [photos, setPhotos] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [rsvpCount, setRsvpCount] = useState<number | null>(null)
  const [rsvped, setRsvped] = useState(false)
  const [rsvpBusy, setRsvpBusy] = useState(false)
  const [rsvpNameOpen, setRsvpNameOpen] = useState(false)
  const [rsvpName, setRsvpName] = useState(() => localStorage.getItem('matipid_rsvp_name') ?? '')
  const rsvpPopoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      dbGet<Event>(`events/${id}`),
      dbGet<Record<string, GalleryImage>>('gallery'),
      dbGet<number>(`rsvps/${id}/count`),
    ]).then(([data, gallery, count]) => {
      setItem(data ?? null)
      if (gallery) {
        setPhotos(
          Object.entries(gallery)
            .map(([gid, v]) => ({ ...v, id: gid }))
            .filter((g) => g.eventId === id)
            .sort((a, b) => b.uploadedAt - a.uploadedAt)
        )
      }
      setRsvpCount(count ?? 0)
      setRsvped(localStorage.getItem(`matipid_rsvp_${id}`) === '1')
    }).finally(() => setLoading(false))
  }, [id])

  async function toggleRsvp(name?: string) {
    if (!id || rsvpBusy) return
    setRsvpBusy(true)
    const goingNext = !rsvped
    try {
      const newCount = await dbIncrement(`rsvps/${id}/count`, goingNext ? 1 : -1)
      setRsvpCount(newCount)
      setRsvped(goingNext)
      if (goingNext) {
        localStorage.setItem(`matipid_rsvp_${id}`, '1')
        if (name?.trim()) {
          localStorage.setItem('matipid_rsvp_name', name.trim())
          await dbPush(`rsvps/${id}/list`, { name: name.trim(), at: Date.now() })
        }
      } else {
        localStorage.removeItem(`matipid_rsvp_${id}`)
      }
    } finally {
      setRsvpBusy(false)
      setRsvpNameOpen(false)
    }
  }

  useEffect(() => {
    if (!rsvpNameOpen) return
    function handler(e: MouseEvent) {
      if (rsvpPopoverRef.current && !rsvpPopoverRef.current.contains(e.target as Node)) setRsvpNameOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [rsvpNameOpen])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (lightbox === null) return
      if (e.key === 'ArrowRight') setLightbox((v) => (v !== null ? Math.min(v + 1, photos.length - 1) : null))
      if (e.key === 'ArrowLeft') setLightbox((v) => (v !== null ? Math.max(v - 1, 0) : null))
      if (e.key === 'Escape') setLightbox(null)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [lightbox, photos.length])

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const el = document.createElement('input')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: item?.title ?? 'Event',
          text: item?.description?.slice(0, 120) ?? '',
          url,
        })
        return
      } catch {
        // user cancelled or not supported — fall back to clipboard
      }
    }
    await copyToClipboard(url)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-200 transition-colors mb-8 group"
        >
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Events
        </Link>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 rounded-2xl w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : !item ? (
          <EmptyState
            icon={Calendar}
            title="Event not found"
            description="This event may have been removed."
          />
        ) : (
          <article>
            {item.coverImage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full rounded-2xl overflow-hidden mb-8 border border-surface-800"
              >
                <img src={item.coverImage} alt={item.title} className="w-full max-h-80 object-cover" />
              </motion.div>
            )}

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gold-500/20 flex items-center justify-center">
                  <Calendar size={14} className="text-gold-700" />
                </div>
                {item.tags?.map((tag) => (
                  <span key={tag} className="badge-gray text-xs flex items-center gap-1">
                    <Tag size={10} />{tag}
                  </span>
                ))}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-surface-100 leading-snug mb-4">
                {item.title}
              </h1>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4 text-sm text-surface-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} />
                    {formatDate(item.date)}
                  </span>
                  {item.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} />
                      {item.location}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative" ref={rsvpPopoverRef}>
                    <button
                      onClick={() => (rsvped ? toggleRsvp() : setRsvpNameOpen((v) => !v))}
                      disabled={rsvpBusy}
                      className={cn(
                        'relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 disabled:opacity-60',
                        rsvped
                          ? 'border-brand-600 bg-brand-600/20 text-brand-500'
                          : 'border-surface-700 text-surface-400 hover:text-surface-100 hover:border-surface-500 hover:bg-surface-800'
                      )}
                      title={rsvped ? "Cancel — you're going" : 'RSVP to this event'}
                    >
                      <PartyPopper size={13} />
                      {rsvped ? "I'm going" : "I'll be there"}
                      {rsvpCount !== null && rsvpCount > 0 && (
                        <span className="text-xs opacity-80">· {rsvpCount}</span>
                      )}
                    </button>

                    {rsvpNameOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-surface-800 bg-surface-900 shadow-xl p-3 z-20"
                      >
                        <p className="text-xs text-surface-400 mb-2">Add your name so officers can plan headcount (optional).</p>
                        <form
                          onSubmit={(e) => { e.preventDefault(); toggleRsvp(rsvpName) }}
                          className="flex items-center gap-2"
                        >
                          <input
                            autoFocus
                            value={rsvpName}
                            onChange={(e) => setRsvpName(e.target.value)}
                            maxLength={60}
                            placeholder="Your name"
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500"
                          />
                          <button
                            type="submit"
                            disabled={rsvpBusy}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-60"
                          >
                            Go
                          </button>
                        </form>
                      </motion.div>
                    )}
                  </div>

                  <AddToCalendar event={item} />

                  <button
                    onClick={handleShare}
                    className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-surface-700 text-surface-400 hover:text-surface-100 hover:border-surface-500 hover:bg-surface-800 transition-all duration-200"
                    title="Share this event"
                  >
                    {copied ? (
                      <span className="flex items-center gap-2 text-green-400">
                        <Check size={13} />
                        Link copied!
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Link2 size={13} />
                        Share
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="h-px bg-surface-800 mb-6" />

            <div className="text-surface-300 text-base leading-relaxed whitespace-pre-wrap">
              {item.description}
            </div>

            <div className="mt-6">
              <Reactions resourceType="event" resourceId={item.id} />
            </div>

            {photos.length > 0 && (
              <div className="mt-10">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon size={15} className="text-surface-500" />
                  <h2 className="text-sm font-semibold text-surface-200">
                    Photos from this event ({photos.length})
                  </h2>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {photos.map((photo, i) => (
                    <button
                      key={photo.id}
                      onClick={() => setLightbox(i)}
                      className="aspect-square rounded-xl overflow-hidden group"
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption ?? ''}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </button>
                  ))}
                </div>
                <Link to="/gallery" className="inline-block mt-4 text-xs font-medium text-brand-600 hover:text-brand-500 transition-colors">
                  View full gallery →
                </Link>
              </div>
            )}

            <Comments resourceType="event" resourceId={item.id} />
          </article>
        )}
      </motion.div>

      {/* Lightbox */}
      {lightbox !== null && photos[lightbox] && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] bg-surface-950/95 backdrop-blur-xl flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(null) }}
            className="absolute top-4 right-4 text-surface-400 hover:text-surface-100 p-2 rounded-xl bg-surface-800/60"
          >
            <X size={20} />
          </button>
          {lightbox > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox((v) => (v! - 1)) }}
              className="absolute left-4 text-surface-400 hover:text-surface-100 p-2 rounded-xl bg-surface-800/60"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <img
            src={photos[lightbox].url}
            alt={photos[lightbox].caption ?? ''}
            className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {lightbox < photos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox((v) => (v! + 1)) }}
              className="absolute right-4 text-surface-400 hover:text-surface-100 p-2 rounded-xl bg-surface-800/60"
            >
              <ChevronRight size={24} />
            </button>
          )}
          {photos[lightbox].caption && (
            <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-surface-300 text-sm bg-surface-900/80 px-4 py-2 rounded-xl">
              {photos[lightbox].caption}
            </p>
          )}
        </motion.div>
      )}
    </div>
  )
}
