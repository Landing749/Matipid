import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Megaphone, X, ExternalLink, Plus, Upload, MapPin, Link2, Check
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isSameMonth, isToday, addMonths, subMonths,
  startOfWeek, endOfWeek
} from 'date-fns'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { dbGet, dbSet, logActivity, saveVersion } from '@/lib/firebase'
import { uploadImage } from '@/lib/cloudinary'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, Spinner, Modal } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

interface CalEvent {
  id: string
  title: string
  description?: string
  date: number
  endDate?: number
  location?: string
  type: 'event' | 'announcement'
  pinned?: boolean
}

interface RawEvent {
  title: string
  description?: string
  date: number
  endDate?: number
  location?: string
}

interface RawAnnouncement {
  title: string
  content?: string
  createdAt: number
  pinned?: boolean
}

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  location: z.string().optional(),
  tags: z.string().optional(),
})
type EventFormValues = z.infer<typeof eventSchema>

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function EventDot({ type }: { type: 'event' | 'announcement' }) {
  return (
    <span className={cn(
      'inline-block w-1.5 h-1.5 rounded-full',
      type === 'event' ? 'bg-brand-400' : 'bg-gold-400'
    )} />
  )
}

export function CalendarView() {
  const { user, profile } = useAuth()
  const [current, setCurrent] = useState(new Date())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Date | null>(null)
  const [detailEvent, setDetailEvent] = useState<CalEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [eventDate, setEventDate] = useState<Date>(new Date())
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleShare(ev: CalEvent) {
    if (ev.type !== 'event') return
    const url = `${window.location.origin}${window.location.pathname}#/events/${ev.id}`
    if (navigator.share) {
      try {
        await navigator.share({ title: ev.title, text: ev.description?.slice(0, 120), url })
        return
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
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
  })

  async function load() {
    const [evData, annData] = await Promise.all([
      dbGet<Record<string, RawEvent>>('events'),
      dbGet<Record<string, RawAnnouncement>>('announcements'),
    ])
    const list: CalEvent[] = []
    if (evData) {
      Object.entries(evData).forEach(([id, v]) => {
        list.push({ id, title: v.title, description: v.description, date: v.date, endDate: v.endDate, location: v.location, type: 'event' })
      })
    }
    if (annData) {
      Object.entries(annData).forEach(([id, v]) => {
        list.push({ id, title: v.title, description: v.content, date: v.createdAt, type: 'announcement', pinned: v.pinned })
      })
    }
    setEvents(list)
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  function openAddEvent(day: Date) {
    setEventDate(day)
    reset({ title: '', description: '', location: '', tags: '' })
    setCoverFile(null)
    setCoverPreview(null)
    setShowEventModal(true)
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  async function onSubmitEvent(values: EventFormValues) {
    if (!user || !profile) return

    let coverImage: string | undefined
    if (coverFile) {
      setUploading(true)
      try {
        const res = await uploadImage(coverFile, 'events')
        coverImage = res.secure_url
      } catch {
        toast.error('Image upload failed.')
        setUploading(false)
        return
      }
      setUploading(false)
    }

    const now = Date.now()
    const tags = values.tags?.split(',').map((t) => t.trim()).filter(Boolean)
    const id = uuid()
    const event = {
      id,
      title: values.title,
      description: values.description,
      date: eventDate.getTime(),
      location: values.location || undefined,
      coverImage,
      tags: tags?.length ? tags : undefined,
      createdBy: user.uid,
      createdByEmail: profile.email,
      createdAt: now,
      updatedAt: now,
    }
    await dbSet(`events/${id}`, JSON.parse(JSON.stringify(event)))
    await saveVersion('events', id, event, user.uid, profile.email)
    await logActivity({
      userUid: user.uid, userEmail: profile.email, role: profile.role,
      action: 'CREATE_EVENT', targetResource: 'events', targetId: id, newValue: event,
    })
    toast.success('Event added to the calendar.')

    setShowEventModal(false)
    reset()
    setCoverFile(null)
    setCoverPreview(null)
    load()
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

  // Upcoming events (next 7 days)
  const now = Date.now()
  const week = now + 7 * 24 * 60 * 60 * 1000
  const upcoming = events
    .filter((e) => e.date >= now && e.date <= week && e.type === 'event')
    .sort((a, b) => a.date - b.date)
    .slice(0, 5)

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <PageHeader
        title="Calendar"
        description="Events and announcements in one view — click a date to add an event."
        action={
          <button onClick={() => openAddEvent(selected ?? new Date())} className="btn-primary">
            <Plus size={16} /> Add Event
          </button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-3 card p-0 overflow-hidden">
          {/* Month header */}
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

          {/* DOW headers */}
          <div className="grid grid-cols-7 border-b border-surface-800/60">
            {DOW.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-surface-500 py-2">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Spinner size={24} />
            </div>
          ) : (
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
                      'group/day relative min-h-[72px] p-2 text-left border-b border-r border-surface-800/30 transition-all',
                      !isCurrentMonth && 'opacity-30',
                      isSelected && 'bg-brand-600/10',
                      !isSelected && 'hover:bg-surface-800/30'
                    )}
                  >
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); openAddEvent(day) }}
                      title="Add event on this date"
                      className="absolute top-1 right-1 w-5 h-5 rounded-md flex items-center justify-center text-surface-500 hover:text-white hover:bg-brand-500 opacity-0 group-hover/day:opacity-100 transition-all z-10"
                    >
                      <Plus size={12} />
                    </span>
                    <span className={cn(
                      'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                      isTodayDay ? 'bg-brand-500 text-white' : 'text-surface-400'
                    )}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {dayEvents.slice(0, 3).map((e) => (
                        <EventDot key={e.id} type={e.type} />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[9px] text-surface-500">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                    {dayEvents.length > 0 && (
                      <div className="hidden sm:block mt-1 space-y-0.5">
                        {dayEvents.slice(0, 2).map((e) => (
                          <p
                            key={e.id}
                            className={cn(
                              'text-[10px] leading-tight truncate px-1 py-0.5 rounded',
                              e.type === 'event' ? 'bg-brand-100 text-brand-700' : 'bg-gold-100 text-gold-700'
                            )}
                          >
                            {e.title}
                          </p>
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Legend */}
          <div className="card py-3">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Legend</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-surface-300">
                <EventDot type="event" /> Events
              </div>
              <div className="flex items-center gap-2 text-sm text-surface-300">
                <EventDot type="announcement" /> Announcements
              </div>
            </div>
          </div>

          {/* Selected day */}
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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openAddEvent(selected)}
                      title="Add event on this date"
                      className="w-6 h-6 flex items-center justify-center rounded-md text-surface-500 hover:text-brand-600 hover:bg-brand-600/10 transition-all"
                    >
                      <Plus size={13} />
                    </button>
                    <button onClick={() => setSelected(null)} className="text-surface-600 hover:text-surface-300 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                </div>
                {selectedDayEvents.length === 0 ? (
                  <button
                    onClick={() => openAddEvent(selected)}
                    className="w-full flex flex-col items-center justify-center gap-1.5 py-6 text-surface-500 hover:text-brand-600 transition-colors"
                  >
                    <Plus size={16} />
                    <span className="text-sm">Nothing scheduled — add an event</span>
                  </button>
                ) : (
                  <div className="divide-y divide-surface-800/40">
                    {selectedDayEvents.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setDetailEvent(e)}
                        className="w-full text-left px-4 py-3 hover:bg-surface-800/30 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <span className={cn(
                            'mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full',
                            e.type === 'event' ? 'bg-brand-400' : 'bg-gold-400'
                          )} />
                          <div className="min-w-0">
                            <p className="text-sm text-surface-100 font-medium truncate">{e.title}</p>
                            <p className="text-xs text-surface-500 capitalize">{e.type}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upcoming */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-800/60">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Upcoming (7 days)</p>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-center text-surface-500 text-sm py-5">No upcoming events</p>
            ) : (
              <div className="divide-y divide-surface-800/40">
                {upcoming.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setDetailEvent(e)}
                    className="w-full text-left px-4 py-3 hover:bg-surface-800/30 transition-colors"
                  >
                    <p className="text-sm text-surface-100 font-medium truncate">{e.title}</p>
                    <p className="text-xs text-surface-500 mt-0.5">{format(new Date(e.date), 'MMM dd · EEE')}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {detailEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => { setDetailEvent(null); setCopied(false) }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="card w-full max-w-md space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {detailEvent.type === 'event' ? (
                    <CalendarIcon size={16} className="text-brand-600" />
                  ) : (
                    <Megaphone size={16} className="text-gold-700" />
                  )}
                  <span className={cn(
                    'text-xs font-medium capitalize px-2 py-0.5 rounded-full',
                    detailEvent.type === 'event' ? 'bg-brand-100 text-brand-700' : 'bg-gold-100 text-gold-700'
                  )}>
                    {detailEvent.type}
                  </span>
                </div>
                <button onClick={() => { setDetailEvent(null); setCopied(false) }} className="text-surface-500 hover:text-surface-200 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div>
                <h3 className="text-surface-100 font-bold text-lg">{detailEvent.title}</h3>
                <p className="text-surface-500 text-sm mt-1">{format(new Date(detailEvent.date), 'MMMM dd, yyyy')}</p>
                {detailEvent.location && (
                  <p className="text-surface-400 text-sm mt-0.5">📍 {detailEvent.location}</p>
                )}
              </div>
              {detailEvent.description && (
                <p className="text-surface-300 text-sm leading-relaxed">{detailEvent.description}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                {detailEvent.type === 'event' && (
                  <button onClick={() => handleShare(detailEvent)} className="btn-secondary text-sm flex items-center gap-1.5">
                    {copied ? <Check size={13} className="text-green-500" /> : <Link2 size={13} />}
                    {copied ? 'Copied!' : 'Share'}
                  </button>
                )}
                <Link
                  to={detailEvent.type === 'event' ? '/portal/events' : '/portal/announcements'}
                  onClick={() => { setDetailEvent(null); setCopied(false) }}
                  className="btn-secondary text-sm flex items-center gap-1.5"
                >
                  <ExternalLink size={13} /> Manage
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add event modal */}
      <Modal
        open={showEventModal}
        onClose={() => { setShowEventModal(false); reset(); setCoverFile(null); setCoverPreview(null) }}
        title={`Add Event — ${format(eventDate, 'MMM dd, yyyy')}`}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmitEvent)} className="space-y-4">
          <div>
            <label className="label">Cover Image (optional)</label>
            <label className="relative block cursor-pointer group">
              {coverPreview ? (
                <div className="relative h-32 rounded-xl overflow-hidden border border-surface-700">
                  <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-[#2b2419]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload size={20} className="text-white" />
                  </div>
                </div>
              ) : (
                <div className="h-32 rounded-xl border-2 border-dashed border-surface-700 hover:border-brand-600/50 flex flex-col items-center justify-center gap-2 transition-colors">
                  <Upload size={18} className="text-surface-500" />
                  <span className="text-sm text-surface-500">Upload cover image</span>
                </div>
              )}
              <input type="file" accept="image/*" className="sr-only" onChange={handleCoverChange} />
            </label>
          </div>

          <div>
            <label className="label">Event Title</label>
            <input className="input" placeholder="e.g. Foundation Day Celebration" {...register('title')} />
            {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input h-24 resize-none" placeholder="What's happening on this date…" {...register('description')} />
            {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <label className="label flex items-center gap-1.5"><MapPin size={12} /> Location (optional)</label>
            <input className="input" placeholder="e.g. School Gymnasium" {...register('location')} />
          </div>

          <div>
            <label className="label">Tags (optional, comma-separated)</label>
            <input className="input" placeholder="e.g. Academic, Sports, Social" {...register('tags')} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowEventModal(false); reset() }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting || uploading} className="btn-primary flex-1">
              {isSubmitting || uploading ? <Spinner size={16} /> : 'Add Event'}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  )
}
