import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react'

export interface CarouselPhoto {
  id: string
  url: string
  caption?: string
  eventTitle?: string
}

const STORAGE_KEY = 'matipid_gallery_carousel_photo'
const AUTOPLAY_MS = 5000

/**
 * Auto-advancing showcase of every photo in the gallery. Remembers the last
 * photo it was showing (by id, in localStorage) so a page refresh resumes
 * from there instead of restarting at photo 1 — useful for a kiosk/TV-style
 * display that's left running.
 */
export function GalleryCarousel({
  photos,
  onOpen,
}: {
  photos: CarouselPhoto[]
  onOpen: (index: number) => void
}) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const hydrated = useRef(false)

  // Resume from wherever we left off, once photos are available.
  useEffect(() => {
    if (hydrated.current || photos.length === 0) return
    hydrated.current = true
    const lastId = localStorage.getItem(STORAGE_KEY)
    const found = lastId ? photos.findIndex((p) => p.id === lastId) : -1
    if (found !== -1) setIndex(found)
  }, [photos])

  // Keep the current position bounded if the underlying list shrinks/changes.
  useEffect(() => {
    if (photos.length === 0) return
    if (index > photos.length - 1) setIndex(0)
  }, [photos, index])

  // Persist position on every change so a refresh continues, not restarts.
  useEffect(() => {
    const photo = photos[index]
    if (photo) localStorage.setItem(STORAGE_KEY, photo.id)
  }, [index, photos])

  useEffect(() => {
    if (!playing || photos.length < 2) return
    const timer = setInterval(() => {
      setIndex((v) => (v + 1) % photos.length)
    }, AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [playing, photos.length])

  if (photos.length === 0) return null
  const photo = photos[index]

  function go(delta: number) {
    setPlaying(false)
    setIndex((v) => (v + delta + photos.length) % photos.length)
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-surface-800 bg-surface-950/60">
      <AnimatePresence mode="wait">
        <motion.div
          key={photo.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="aspect-video sm:aspect-[16/7] cursor-pointer"
          onClick={() => onOpen(index)}
        >
          <img src={photo.url} alt={photo.caption ?? ''} className="w-full h-full object-cover" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-t from-surface-950/85 via-transparent to-transparent pointer-events-none" />

      {(photo.caption || photo.eventTitle) && (
        <div className="absolute bottom-4 left-4 right-28 pointer-events-none">
          {photo.eventTitle && <p className="text-brand-400 text-xs font-medium">{photo.eventTitle}</p>}
          {photo.caption && <p className="text-surface-100 text-sm line-clamp-1">{photo.caption}</p>}
        </div>
      )}

      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); go(-1) }}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-surface-950/70 text-surface-200 hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); go(1) }}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-surface-950/70 text-surface-200 hover:text-white transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        {photos.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); setPlaying((v) => !v) }}
            aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
            className="p-1.5 rounded-full bg-surface-950/70 text-surface-200 hover:text-white transition-colors"
          >
            {playing ? <Pause size={13} /> : <Play size={13} />}
          </button>
        )}
        <span className="text-[11px] text-surface-300 bg-surface-950/70 px-2 py-1 rounded-full">
          {index + 1} / {photos.length}
        </span>
      </div>
    </div>
  )
}
