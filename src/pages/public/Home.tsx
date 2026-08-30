import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, DollarSign, Calendar, Image, Megaphone, Shield, Users, Sparkles, X, ImagePlus, Heart } from 'lucide-react'
import { isSameDay } from 'date-fns'
import { dbGet } from '@/lib/firebase'
import { formatDate, cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui'
import { Logo } from '@/components/Logo'
import { EventCountdown } from '@/components/EventCountdown'
import { AnthemEmbed } from '@/components/AnthemEmbed'

interface Settings {
  siteTitle?: string
  motto?: string
  description?: string
  bannerImage?: string
}

interface Announcement {
  id: string
  title: string
  content: string
  coverImage?: string
  author: string
  createdAt: number
  pinned?: boolean
  status?: 'draft' | 'published'
  publishAt?: number
}

interface EventItem {
  id: string
  title: string
  date: number
  location?: string
}

interface FeaturedEvent extends EventItem {
  happeningNow: boolean
}

interface GalleryImage {
  id: string
  url: string
  caption?: string
  uploadedAt: number
}

interface HighlightPhoto extends GalleryImage {
  totalLikes: number
  isThisMonth: boolean
}

function isPubliclyVisible(a: Announcement) {
  if (a.status === 'draft') return false
  if (a.publishAt && a.publishAt > Date.now()) return false
  return true
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.09 } },
}

const tileIn = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
}

interface StatDef {
  icon: typeof Calendar
  label: string
  value: number
}

const features = [
  {
    icon: Megaphone, title: 'Announcements', desc: 'Stay updated with the latest section news and notices.',
    to: '/announcements', tone: 'brand', span: 'sm:col-span-2',
  },
  { icon: Calendar, title: 'Events', desc: 'Past and upcoming section activities.', to: '/events', tone: 'gold', span: '' },
  { icon: Image, title: 'Gallery', desc: 'Memories from every event.', to: '/gallery', tone: 'clay', span: '' },
  {
    icon: Shield, title: 'Financial Transparency', desc: 'Full visibility — every peso accounted for, all the time.',
    to: '/finances', tone: 'brand', span: 'sm:row-span-2',
  },
  { icon: DollarSign, title: 'Budget Reports', desc: 'Monthly summaries at a glance.', to: '/finances', tone: 'gold', span: '' },
  { icon: Users, title: 'Our Officers', desc: 'Meet the team running your section.', to: '/officers', tone: 'clay', span: '' },
]

const toneClasses: Record<string, string> = {
  brand: 'bg-brand-100 text-brand-700',
  gold: 'bg-gold-200 text-gold-700',
  clay: 'bg-clay-100 text-clay-700',
}

const EVENT_BANNER_DISMISS_KEY = 'matipid:dismissedEventBannerId'

export function Home() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [featuredEvent, setFeaturedEvent] = useState<FeaturedEvent | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [nextEvent, setNextEvent] = useState<EventItem | null>(null)
  const [recentPhotos, setRecentPhotos] = useState<GalleryImage[]>([])
  const [highlightPhoto, setHighlightPhoto] = useState<HighlightPhoto | null>(null)
  const [stats, setStats] = useState<StatDef[]>([
    { icon: Calendar, label: 'Events Held', value: 0 },
    { icon: Image, label: 'Gallery Photos', value: 0 },
    { icon: Megaphone, label: 'Announcements', value: 0 },
    { icon: Users, label: 'Officers', value: 0 },
  ])

  useEffect(() => {
    Promise.all([
      dbGet<Settings>('settings'),
      dbGet<Record<string, Announcement>>('announcements'),
      dbGet<Record<string, { title: string; date: number; location?: string }>>('events'),
      dbGet<Record<string, GalleryImage>>('gallery'),
      dbGet<Record<string, unknown>>('officers'),
      dbGet<Record<string, Record<string, { count: number }>>>('reactions/photo'),
    ]).then(([s, ann, events, gallery, officers, photoReactions]) => {
      setSettings(s)
      let publishedAnnouncements = 0
      if (ann) {
        const list = Object.entries(ann)
          .map(([id, v]) => ({ ...v, id }))
          .filter(isPubliclyVisible)
          .sort((a, b) => b.createdAt - a.createdAt)
        publishedAnnouncements = list.length
        const pinned = list.find((a) => a.pinned) ?? list[0]
        setAnnouncement(pinned ?? null)
      }
      let eventsHeld = 0
      if (events) {
        const now = new Date()
        const list: EventItem[] = Object.entries(events).map(([id, v]) => ({ id, ...v }))
        const today = list.find((e) => isSameDay(new Date(e.date), now))
        const chosen: FeaturedEvent | null = today
          ? { ...today, happeningNow: true }
          : (() => {
              const upcoming = list
                .filter((e) => e.date > now.getTime())
                .sort((a, b) => a.date - b.date)[0]
              return upcoming ? { ...upcoming, happeningNow: false } : null
            })()

        if (chosen) {
          setFeaturedEvent(chosen)
          try {
            setBannerDismissed(localStorage.getItem(EVENT_BANNER_DISMISS_KEY) === chosen.id)
          } catch {
            setBannerDismissed(false)
          }
        }

        const upcomingOnly = list
          .filter((e) => e.date >= now.getTime())
          .sort((a, b) => a.date - b.date)[0]
        setNextEvent(upcomingOnly ?? null)

        eventsHeld = list.filter((e) => e.date <= now.getTime()).length
      }
      let galleryPhotos = 0
      if (gallery) {
        const list = Object.entries(gallery).map(([id, v]) => ({ ...v, id }))
        galleryPhotos = list.length
        setRecentPhotos(list.sort((a, b) => b.uploadedAt - a.uploadedAt).slice(0, 4))

        // Photo of the Month — most reactions among photos uploaded this
        // calendar month, falling back to the most-liked photo overall.
        if (photoReactions) {
          const likesFor = (id: string) =>
            Object.values(photoReactions[id] ?? {}).reduce((sum, r) => sum + (r.count ?? 0), 0)

          const now = new Date()
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

          const withLikes = list
            .map((img) => ({ ...img, totalLikes: likesFor(img.id) }))
            .filter((img) => img.totalLikes > 0)

          const thisMonth = withLikes.filter((img) => img.uploadedAt >= monthStart)
          const pool = thisMonth.length > 0 ? thisMonth : withLikes
          const top = pool.sort((a, b) => b.totalLikes - a.totalLikes)[0]

          if (top) {
            setHighlightPhoto({ ...top, isThisMonth: thisMonth.length > 0 })
          }
        }
      }
      const officerCount = officers ? Object.keys(officers).length : 0

      setStats([
        { icon: Calendar, label: 'Events Held', value: eventsHeld },
        { icon: Image, label: 'Gallery Photos', value: galleryPhotos },
        { icon: Megaphone, label: 'Announcements', value: publishedAnnouncements },
        { icon: Users, label: 'Officers', value: officerCount },
      ])
    }).finally(() => setLoading(false))
  }, [])

  function dismissBanner(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (featuredEvent) {
      try {
        localStorage.setItem(EVENT_BANNER_DISMISS_KEY, featuredEvent.id)
      } catch {
        // ignore storage failures (private browsing, etc.)
      }
    }
    setBannerDismissed(true)
  }

  return (
    <div className="relative">
      {/* Event banner */}
      <AnimatePresence initial={false}>
        {featuredEvent && !bannerDismissed && (
          <motion.div
            key={featuredEvent.id}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden relative"
          >
            <Link
              to={`/events/${featuredEvent.id}`}
              className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 pl-4 pr-10 py-2.5 text-sm text-center bg-gradient-to-r from-brand-700 to-brand-600 text-white hover:from-brand-600 hover:to-brand-500 transition-all"
            >
              {featuredEvent.happeningNow ? (
                <span className="flex items-center gap-1.5 font-semibold flex-shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                  Happening Today
                </span>
              ) : (
                <span className="font-semibold flex-shrink-0">Upcoming Event</span>
              )}
              <span className="opacity-70">·</span>
              <span className="font-medium truncate max-w-[240px] sm:max-w-none">{featuredEvent.title}</span>
              {!featuredEvent.happeningNow && (
                <>
                  <span className="opacity-70 hidden sm:inline">·</span>
                  <span className="opacity-90 hidden sm:inline">{formatDate(featuredEvent.date)}</span>
                </>
              )}
              {featuredEvent.location && (
                <>
                  <span className="opacity-70 hidden sm:inline">·</span>
                  <span className="opacity-90 hidden sm:inline">{featuredEvent.location}</span>
                </>
              )}
              <ArrowRight size={14} className="flex-shrink-0" />
            </Link>
            <button
              onClick={dismissBanner}
              title="Dismiss"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-bg" />
        <div className="absolute inset-0 hero-grid" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-12 sm:pt-24 sm:pb-16">
          <motion.div {...stagger} initial="initial" animate="animate" className="clay rounded-5xl px-6 py-12 sm:px-14 sm:py-16 text-center space-y-6 relative">

            {/* Logo */}
            <motion.div {...fadeUp} className="flex justify-center">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
                <Logo size={92} rounded="rounded-full" />
              </motion.div>
            </motion.div>

            {/* Badge */}
            <motion.div {...fadeUp}>
              <span className="badge-purple text-[11px] tracking-widest uppercase">
                <Sparkles size={12} /> Grade 8 · Section MATIPID
              </span>
            </motion.div>

            {/* Title */}
            <motion.div {...fadeUp}>
              {loading ? (
                <Skeleton className="h-16 w-96 mx-auto" />
              ) : (
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-surface-100">
                  {settings?.siteTitle ?? 'Section MATIPID'}
                </h1>
              )}
            </motion.div>

            {/* Motto */}
            <motion.div {...fadeUp}>
              {loading ? (
                <Skeleton className="h-6 w-64 mx-auto" />
              ) : (
                <p className="text-lg sm:text-xl gradient-text font-bold">
                  {settings?.motto ?? 'Transparent. Accountable. United.'}
                </p>
              )}
            </motion.div>

            {/* Description */}
            <motion.div {...fadeUp}>
              <p className="text-surface-400 max-w-xl mx-auto leading-relaxed">
                {settings?.description ?? 'Our official section portal — your window into announcements, events, finances, and everything that keeps our section moving forward.'}
              </p>
            </motion.div>

            {/* CTAs */}
            <motion.div {...fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link to="/announcements" className="btn-primary gap-2">
                View Announcements <ArrowRight size={16} />
              </Link>
              <Link to="/finances" className="btn-secondary gap-2">
                <Shield size={16} />
                Financial Transparency
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============ Countdown to next event ============ */}
      {!loading && nextEvent && (
        <section className="max-w-2xl mx-auto px-4 sm:px-6 pb-2">
          <motion.div {...fadeUp}>
            <EventCountdown event={nextEvent} />
          </motion.div>
        </section>
      )}

      {/* ============ What's New digest ============ */}
      {!loading && (announcement || nextEvent || recentPhotos.length > 0) && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 -mt-2 pb-4">
          <motion.div {...tileIn} transition={{ duration: 0.4 }} className="grid sm:grid-cols-3 gap-4">
            {/* Latest update */}
            <Link
              to={announcement ? '/announcements' : '#'}
              className={cn('card-hover flex items-start gap-3', !announcement && 'pointer-events-none opacity-50')}
            >
              <div className="icon-tile bg-brand-50 text-brand-600 flex-shrink-0">
                <Megaphone size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-surface-500 uppercase tracking-wider font-semibold mb-1">Latest update</p>
                {announcement ? (
                  <>
                    <p className="text-sm font-semibold text-surface-100 truncate">{announcement.title}</p>
                    <p className="text-xs text-surface-500 mt-0.5">{formatDate(announcement.createdAt)}</p>
                  </>
                ) : (
                  <p className="text-sm text-surface-500">Nothing posted yet</p>
                )}
              </div>
            </Link>

            {/* Next event */}
            <Link
              to={nextEvent ? `/events/${nextEvent.id}` : '#'}
              className={cn('card-hover flex items-start gap-3', !nextEvent && 'pointer-events-none opacity-50')}
            >
              <div className="icon-tile bg-gold-200 text-gold-700 flex-shrink-0">
                <Calendar size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-surface-500 uppercase tracking-wider font-semibold mb-1">Next up</p>
                {nextEvent ? (
                  <>
                    <p className="text-sm font-semibold text-surface-100 truncate">{nextEvent.title}</p>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {formatDate(nextEvent.date)}{nextEvent.location ? ` · ${nextEvent.location}` : ''}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-surface-500">No upcoming events</p>
                )}
              </div>
            </Link>

            {/* Recent photos */}
            <Link
              to={recentPhotos.length > 0 ? '/gallery' : '#'}
              className={cn('card-hover flex items-start gap-3', recentPhotos.length === 0 && 'pointer-events-none opacity-50')}
            >
              <div className="icon-tile bg-clay-100 text-clay-700 flex-shrink-0">
                <ImagePlus size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-surface-500 uppercase tracking-wider font-semibold mb-1.5">Fresh photos</p>
                {recentPhotos.length > 0 ? (
                  <div className="flex gap-1.5">
                    {recentPhotos.map((photo) => (
                      <div key={photo.id} className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={photo.url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-surface-500">No photos yet</p>
                )}
              </div>
            </Link>
          </motion.div>
        </section>
      )}

      {/* ============ Photo of the Month ============ */}
      {!loading && highlightPhoto && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-4">
          <motion.div {...tileIn} transition={{ duration: 0.4 }}>
            <Link
              to={`/gallery?photo=${highlightPhoto.id}`}
              className="bento-tile group flex items-center gap-4 sm:gap-5 !p-3 sm:!p-4"
            >
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl overflow-hidden flex-shrink-0">
                <img
                  src={highlightPhoto.url}
                  alt={highlightPhoto.caption ?? ''}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-surface-500 uppercase tracking-wider font-semibold mb-1">
                  {highlightPhoto.isThisMonth ? 'Photo of the Month' : 'Most-loved Photo'}
                </p>
                <p className="text-sm sm:text-base font-semibold text-surface-100 truncate group-hover:text-brand-600 transition-colors">
                  {highlightPhoto.caption || 'A favorite from the gallery'}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-surface-500 mt-1.5">
                  <Heart size={12} className="text-red-500 fill-red-500" />
                  {highlightPhoto.totalLikes} reaction{highlightPhoto.totalLikes === 1 ? '' : 's'}
                </p>
              </div>
            </Link>
          </motion.div>
        </section>
      )}

      {/* ============ Bento grid ============ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20 space-y-4">

        {/* Row 1 — stats + featured announcement, mosaic */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 auto-rows-[minmax(96px,auto)]">
          {announcement && (
            <motion.div
              {...tileIn}
              transition={{ duration: 0.45 }}
              className="col-span-2 sm:row-span-2 bento-tile !p-0 flex flex-col"
            >
              <Link to="/announcements" className="flex flex-col h-full group">
                {announcement.coverImage ? (
                  <div className="h-32 sm:h-40 overflow-hidden">
                    <img
                      src={announcement.coverImage}
                      alt={announcement.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="h-16 flex items-end px-6 pt-6">
                    <span className="badge-gold">Latest</span>
                  </div>
                )}
                <div className="p-5 sm:p-6 flex-1 flex flex-col">
                  {announcement.pinned && <span className="badge-gold mb-2 self-start">📌 Pinned</span>}
                  <h3 className="text-base sm:text-lg font-bold text-surface-100 mb-1.5 group-hover:text-brand-600 transition-colors">
                    {announcement.title}
                  </h3>
                  <p className="text-surface-400 text-sm line-clamp-2">{announcement.content}</p>
                  <div className="flex items-center gap-2 mt-auto pt-4 text-xs text-surface-500">
                    <span>{announcement.author}</span>
                    <span>·</span>
                    <span>{formatDate(announcement.createdAt)}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}

          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              {...tileIn}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              whileHover={{ y: -3 }}
              className="bento-tile flex flex-col justify-between"
            >
              <div className="icon-tile bg-brand-50 text-brand-600">
                <stat.icon size={18} />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-surface-100 tabular-nums">{stat.value}</p>
                <p className="text-[11px] text-surface-500 uppercase tracking-wider font-semibold">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Section anthem, if configured */}
        <div className="pt-6">
          <AnthemEmbed />
        </div>

        {/* Section label */}
        <div className="pt-6 pb-1 flex items-center gap-3">
          <div className="icon-tile bg-clay-50 text-clay-600 w-8 h-8">
            <Sparkles size={14} />
          </div>
          <h2 className="text-lg font-bold text-surface-100">Everything in one place</h2>
        </div>

        {/* Row 2 — feature bento mosaic */}
        <div className="grid sm:grid-cols-4 gap-4 auto-rows-[minmax(150px,auto)]">
          {features.map((item, i) => (
            <motion.div
              key={item.title}
              {...tileIn}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className={item.span}
            >
              <Link to={item.to} className="bento-tile group flex flex-col gap-3 h-full">
                <div className={`icon-tile ${toneClasses[item.tone]}`}>
                  <item.icon size={18} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-surface-100 group-hover:text-brand-600 transition-colors">{item.title}</h3>
                  <p className="text-surface-500 text-sm mt-1">{item.desc}</p>
                </div>
                <ArrowRight size={16} className="text-surface-400 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Closing CTA banner */}
        <motion.div {...tileIn} transition={{ duration: 0.45 }} className="bento-tile mt-4 text-center py-10 sm:py-12">
          <p className="badge-purple mb-4 inline-flex">Section MATIPID</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-surface-100 mb-3">Curious where the section fund goes?</h3>
          <p className="text-surface-400 max-w-md mx-auto mb-6">Every contribution, expense, and balance is logged and open for every member to see.</p>
          <Link to="/finances" className="btn-gold gap-2 inline-flex">
            Open the ledger <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>
    </div>
  )
}
