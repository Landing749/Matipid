import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Link2, Check, MessageCircle, Download, Loader2, Play, Pause } from 'lucide-react'
import { Reactions } from '@/components/Reactions'
import { Comments } from '@/components/Comments'

export interface LightboxPhoto {
  id: string
  url: string
  caption?: string
  eventId?: string
  eventTitle?: string
}

/**
 * Full-screen photo viewer shared by the public Gallery and each event's
 * photo grid. Every photo gets its own shareable link (`?photo=<id>`),
 * likes (via Reactions), and a comment thread — keyed on the photo's id
 * so they're independent of whichever page the photo is being viewed from.
 */
export function PhotoLightbox({
  photos,
  index,
  onClose,
  onIndexChange,
  buildShareUrl,
}: {
  photos: LightboxPhoto[]
  index: number
  onClose: () => void
  onIndexChange: (index: number) => void
  /** Given a photo, return the absolute URL that should be shared for it. */
  buildShareUrl: (photo: LightboxPhoto) => string
}) {
  const photo = photos[index]
  const [copied, setCopied] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const indexRef = useRef(index)
  indexRef.current = index

  // Reset the comments panel whenever the viewed photo changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local UI state to the active photo, not derived render state
    setShowComments(false)
  }, [photo?.id])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') { setPlaying(false); onIndexChange(Math.min(index + 1, photos.length - 1)) }
      if (e.key === 'ArrowLeft') { setPlaying(false); onIndexChange(Math.max(index - 1, 0)) }
      if (e.key === 'Escape') onClose()
      if (e.key === ' ') { e.preventDefault(); setPlaying((v) => !v) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [index, photos.length, onIndexChange, onClose])

  // Slideshow autoplay — advances every 4s, loops back to the start, stops
  // automatically once there's nothing left to play through.
  useEffect(() => {
    if (!playing || photos.length < 2) return
    const timer = setInterval(() => {
      const next = indexRef.current + 1 >= photos.length ? 0 : indexRef.current + 1
      onIndexChange(next)
    }, 4000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, photos.length])

  if (!photo) return null

  function filenameFor(p: LightboxPhoto) {
    const base = (p.caption || p.eventTitle || 'photo').trim().replace(/[^\w\- ]+/g, '').trim() || 'photo'
    const extMatch = p.url.match(/\.(jpe?g|png|webp|gif|avif)(?:$|\?)/i)
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg'
    return `${base}.${ext}`
  }

  async function handleDownload() {
    if (downloading) return
    setDownloading(true)
    try {
      const res = await fetch(photo.url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filenameFor(photo)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      // Fetch/CORS failed — fall back to opening the image directly so the
      // user can still save it manually.
      window.open(photo.url, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloading(false)
    }
  }

  async function handleShare() {
    const url = buildShareUrl(photo)
    if (navigator.share) {
      try {
        await navigator.share({
          title: photo.eventTitle ? `Photo — ${photo.eventTitle}` : 'Photo',
          text: photo.caption ?? '',
          url,
        })
        return
      } catch {
        // user cancelled or not supported — fall back to clipboard
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-surface-950/95 backdrop-blur-xl flex flex-col items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="absolute top-4 right-4 text-surface-400 hover:text-surface-100 p-2 rounded-xl bg-surface-800/60 z-10"
      >
        <X size={20} />
      </button>

      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setPlaying(false); onIndexChange(index - 1) }}
          className="absolute left-4 text-surface-400 hover:text-surface-100 p-2 rounded-xl bg-surface-800/60 z-10"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      <div className="flex flex-col items-center max-h-[90vh] w-full px-4" onClick={(e) => e.stopPropagation()}>
        <img
          src={photo.url}
          alt={photo.caption ?? ''}
          className="max-h-[62vh] sm:max-h-[68vh] max-w-full rounded-2xl object-contain"
        />

        {(photo.caption || photo.eventTitle) && (
          <p className="mt-3 text-surface-300 text-sm text-center">
            {photo.caption}
            {photo.caption && photo.eventTitle && <span className="text-surface-600"> · </span>}
            {photo.eventTitle}
          </p>
        )}

        {/* Actions bar — likes, comments, share */}
        <div className="mt-4 flex items-center gap-2 flex-wrap justify-center">
          <Reactions resourceType="photo" resourceId={photo.id} />

          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setPlaying((v) => !v) }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${
                playing
                  ? 'border-brand-600 bg-brand-600/15 text-brand-500'
                  : 'border-surface-700 text-surface-400 hover:border-surface-500 hover:bg-surface-800'
              }`}
              title={playing ? 'Pause slideshow' : 'Play slideshow'}
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
              {playing ? 'Pause' : 'Slideshow'}
            </button>
          )}

          <button
            onClick={() => setShowComments((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${
              showComments
                ? 'border-brand-600 bg-brand-600/15 text-brand-500'
                : 'border-surface-700 text-surface-400 hover:border-surface-500 hover:bg-surface-800'
            }`}
          >
            <MessageCircle size={14} />
            Comments
          </button>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-surface-700 text-surface-400 hover:border-surface-500 hover:bg-surface-800 transition-all"
          >
            {copied ? (
              <span className="flex items-center gap-1.5 text-green-400">
                <Check size={14} /> Link copied!
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Link2 size={14} /> Share
              </span>
            )}
          </button>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-surface-700 text-surface-400 hover:border-surface-500 hover:bg-surface-800 transition-all disabled:opacity-60"
          >
            {downloading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={14} className="animate-spin" /> Downloading…
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Download size={14} /> Download
              </span>
            )}
          </button>
        </div>

        {/* Comments panel */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full max-w-lg mt-2 overflow-y-auto max-h-[32vh] px-1"
            >
              <Comments resourceType="photo" resourceId={photo.id} compact />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {index < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setPlaying(false); onIndexChange(index + 1) }}
          className="absolute right-4 text-surface-400 hover:text-surface-100 p-2 rounded-xl bg-surface-800/60 z-10"
        >
          <ChevronRight size={24} />
        </button>
      )}
    </motion.div>
  )
}
