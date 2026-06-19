import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Image as ImageIcon, Clock, Users, Info, ExternalLink, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { dbGet } from '@/lib/firebase'
import { formatDate } from '@/lib/utils'
import { EmptyState, Skeleton } from '@/components/ui'

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
}

// ─── Events ──────────────────────────────────────────────────────────────────

export function Events() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-gold-500/20 flex items-center justify-center">
            <Calendar size={16} className="text-gold-400" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100">Events</h1>
        </div>
        <p className="text-surface-500 text-sm mb-8">A record of every section activity and gathering.</p>

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
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-hover p-0 overflow-hidden group"
              >
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
                  <div className="flex items-center gap-3 text-xs text-surface-500">
                    <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(event.date)}</span>
                    {event.location && <span>· {event.location}</span>}
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

// ─── Gallery ─────────────────────────────────────────────────────────────────

export function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<number | null>(null)

  useEffect(() => {
    dbGet<Record<string, GalleryImage>>('gallery').then((data) => {
      if (data) {
        setImages(
          Object.entries(data)
            .map(([id, v]) => ({ ...v, id }))
            .sort((a, b) => b.uploadedAt - a.uploadedAt)
        )
      }
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (lightbox === null) return
      if (e.key === 'ArrowRight') setLightbox((v) => (v !== null ? Math.min(v + 1, images.length - 1) : null))
      if (e.key === 'ArrowLeft') setLightbox((v) => (v !== null ? Math.max(v - 1, 0) : null))
      if (e.key === 'Escape') setLightbox(null)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [lightbox, images.length])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <ImageIcon size={16} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100">Gallery</h1>
        </div>
        <p className="text-surface-500 text-sm mb-8">Memories captured from every section event.</p>

        {loading ? (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className={`w-full ${i % 3 === 0 ? 'h-48' : 'h-32'} break-inside-avoid`} />
            ))}
          </div>
        ) : images.length === 0 ? (
          <EmptyState icon={ImageIcon} title="No photos yet" description="Gallery images will appear here." />
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
            {images.map((img, i) => (
              <div
                key={img.id}
                onClick={() => setLightbox(i)}
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

      {/* Lightbox */}
      {lightbox !== null && images[lightbox] && (
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
            src={images[lightbox].url}
            alt={images[lightbox].caption ?? ''}
            className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {lightbox < images.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox((v) => (v! + 1)) }}
              className="absolute right-4 text-surface-400 hover:text-surface-100 p-2 rounded-xl bg-surface-800/60"
            >
              <ChevronRight size={24} />
            </button>
          )}
          {images[lightbox].caption && (
            <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-surface-300 text-sm bg-surface-900/80 px-4 py-2 rounded-xl">
              {images[lightbox].caption}
            </p>
          )}
        </motion.div>
      )}
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
            <Clock size={16} className="text-brand-400" />
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
                    <p className="text-xs text-brand-400 font-mono mb-1">{formatDate(entry.date)}</p>
                    <h2 className="text-base font-semibold text-surface-100 mb-1 group-hover:text-brand-300 transition-colors">{entry.title}</h2>
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
        setOfficers(Object.entries(data).map(([id, v]) => ({ ...v, id })))
      }
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center">
            <Users size={16} className="text-brand-400" />
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
                <p className="text-sm text-brand-400 mt-1">{officer.position}</p>
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
            <Info size={16} className="text-brand-400" />
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
                  <p className="text-sm font-medium text-brand-300 mb-1">{v.label}</p>
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
