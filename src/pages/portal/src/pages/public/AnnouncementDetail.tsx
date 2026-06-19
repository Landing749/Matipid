import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Megaphone, Pin, ArrowLeft, Calendar, User, Share2, Check, Link2 } from 'lucide-react'
import { dbGet } from '@/lib/firebase'
import { formatDate } from '@/lib/utils'
import { Skeleton, EmptyState } from '@/components/ui'

interface Announcement {
  id: string
  title: string
  content: string
  coverImage?: string
  author: string
  createdAt: number
  pinned?: boolean
}

export function AnnouncementDetail() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    dbGet<Announcement>(`announcements/${id}`)
      .then((data) => setItem(data ?? null))
      .finally(() => setLoading(false))
  }, [id])

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: item?.title ?? 'Announcement',
          text: item?.content?.slice(0, 120) ?? '',
          url,
        })
      } catch {
        // user cancelled or not supported — fall back to clipboard
        await copyToClipboard(url)
      }
    } else {
      await copyToClipboard(url)
    }
  }

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback for older browsers
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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Back link */}
        <Link
          to="/announcements"
          className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-200 transition-colors mb-8 group"
        >
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Announcements
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
            icon={Megaphone}
            title="Announcement not found"
            description="This announcement may have been removed."
          />
        ) : (
          <article>
            {/* Cover image */}
            {item.coverImage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full rounded-2xl overflow-hidden mb-8 border border-surface-800"
              >
                <img
                  src={item.coverImage}
                  alt={item.title}
                  className="w-full max-h-80 object-cover"
                />
              </motion.div>
            )}

            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-brand-600/20 flex items-center justify-center">
                  <Megaphone size={14} className="text-brand-400" />
                </div>
                {item.pinned && (
                  <span className="badge-gold flex items-center gap-1 text-xs">
                    <Pin size={10} /> Pinned
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-surface-100 leading-snug mb-4">
                {item.title}
              </h1>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4 text-sm text-surface-500">
                  <span className="flex items-center gap-1.5">
                    <User size={13} />
                    {item.author}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} />
                    {formatDate(item.createdAt)}
                  </span>
                </div>

                {/* Share button */}
                <button
                  onClick={handleShare}
                  className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-surface-700 text-surface-400 hover:text-surface-100 hover:border-surface-500 hover:bg-surface-800 transition-all duration-200 group"
                  title="Share this announcement"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {copied ? (
                      <motion.span
                        key="check"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        className="flex items-center gap-2 text-green-400"
                      >
                        <Check size={13} />
                        Link copied!
                      </motion.span>
                    ) : (
                      <motion.span
                        key="share"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        className="flex items-center gap-2"
                      >
                        <Link2 size={13} />
                        Share
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-surface-800 mb-6" />

            {/* Body */}
            <div className="text-surface-300 text-base leading-relaxed whitespace-pre-wrap">
              {item.content}
            </div>
          </article>
        )}
      </motion.div>
    </div>
  )
}
