import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, DollarSign, Calendar, Image, Megaphone, Shield, Users } from 'lucide-react'
import { dbGet } from '@/lib/firebase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Skeleton } from '@/components/ui'

interface Settings {
  siteTitle?: string
  motto?: string
  description?: string
  bannerImage?: string
}

interface Stats {
  totalEvents?: number
  totalImages?: number
  totalAnnouncements?: number
  currentBalance?: number
}

interface Announcement {
  id: string
  title: string
  content: string
  coverImage?: string
  author: string
  createdAt: number
  pinned?: boolean
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
}

export function Home() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)

  useEffect(() => {
    Promise.all([
      dbGet<Settings>('settings'),
      dbGet<Record<string, Announcement>>('announcements'),
    ]).then(([s, ann]) => {
      setSettings(s)
      if (ann) {
        const list = Object.entries(ann)
          .map(([id, v]) => ({ ...v, id }))
          .sort((a, b) => b.createdAt - a.createdAt)
        const pinned = list.find((a) => a.pinned) ?? list[0]
        setAnnouncement(pinned ?? null)
      }
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 hero-bg" />
        <div className="absolute inset-0">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-brand-400/20"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animation: 'pulse 3s infinite',
              }}
            />
          ))}
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div {...stagger} initial="initial" animate="animate" className="space-y-6">
            {/* Badge */}
            <motion.div {...fadeUp}>
              <span className="badge-purple text-xs tracking-widest uppercase">
                Grade 8 · Section MATIPID
              </span>
            </motion.div>

            {/* Title */}
            <motion.div {...fadeUp}>
              {loading ? (
                <Skeleton className="h-16 w-96 mx-auto" />
              ) : (
                <h1 className="text-5xl sm:text-7xl font-bold tracking-tight">
                  <span className="text-surface-100">
                    {settings?.siteTitle ?? 'Section MATIPID'}
                  </span>
                </h1>
              )}
            </motion.div>

            {/* Motto */}
            <motion.div {...fadeUp}>
              {loading ? (
                <Skeleton className="h-6 w-64 mx-auto" />
              ) : (
                <p className="text-xl sm:text-2xl gradient-text font-semibold">
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
            <motion.div {...fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
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

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
          <div className="w-6 h-10 rounded-full border-2 border-surface-700 flex items-start justify-center pt-1.5">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-brand-500"
            />
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-surface-800/60 bg-surface-900/40 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {[
            { icon: Calendar, label: 'Events Held', value: '12+' },
            { icon: Image, label: 'Gallery Photos', value: '200+' },
            { icon: Megaphone, label: 'Announcements', value: '30+' },
            { icon: Users, label: 'Officers', value: '10' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-2 text-center">
              <stat.icon size={20} className="text-brand-400" />
              <p className="text-2xl font-bold text-surface-100">{stat.value}</p>
              <p className="text-xs text-surface-500 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured announcement */}
      {announcement && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-surface-100">Latest Announcement</h2>
            <Link to="/announcements" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card-hover p-0 overflow-hidden"
          >
            {announcement.coverImage && (
              <div className="h-48 overflow-hidden">
                <img
                  src={announcement.coverImage}
                  alt={announcement.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-6">
              {announcement.pinned && <span className="badge-gold mb-3">📌 Pinned</span>}
              <h3 className="text-lg font-semibold text-surface-100 mb-2">{announcement.title}</h3>
              <p className="text-surface-400 text-sm line-clamp-2">{announcement.content}</p>
              <div className="flex items-center gap-3 mt-4 text-xs text-surface-500">
                <span>{announcement.author}</span>
                <span>·</span>
                <span>{formatDate(announcement.createdAt)}</span>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* Feature grid */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-xl font-bold text-surface-100 mb-8 text-center">Everything in one place</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Megaphone, title: 'Announcements', desc: 'Stay updated with the latest section news and notices.', to: '/announcements', color: 'brand' },
            { icon: Calendar, title: 'Events', desc: 'Browse past and upcoming section activities.', to: '/events', color: 'gold' },
            { icon: Image, title: 'Gallery', desc: 'Memories from every event, beautifully organized.', to: '/gallery', color: 'green' },
            { icon: Shield, title: 'Transparency', desc: 'Full financial visibility — every peso accounted for.', to: '/finances', color: 'brand' },
            { icon: DollarSign, title: 'Budget Reports', desc: 'Monthly summaries and audit status at a glance.', to: '/finances', color: 'gold' },
            { icon: Users, title: 'Our Officers', desc: 'Meet the team running your section.', to: '/officers', color: 'green' },
          ].map((item) => (
            <Link
              key={item.title}
              to={item.to}
              className="card-hover group flex flex-col gap-3"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                item.color === 'brand' ? 'bg-brand-600/15 text-brand-400' :
                item.color === 'gold' ? 'bg-gold-500/15 text-gold-400' :
                'bg-emerald-500/15 text-emerald-400'
              }`}>
                <item.icon size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-surface-100 group-hover:text-brand-300 transition-colors">{item.title}</h3>
                <p className="text-surface-500 text-sm mt-1">{item.desc}</p>
              </div>
              <ArrowRight size={14} className="text-surface-600 group-hover:text-brand-400 group-hover:translate-x-1 transition-all mt-auto" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
