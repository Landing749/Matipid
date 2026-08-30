import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Image, Upload, Trash2, X, ChevronLeft, ChevronRight, Plus, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { v4 as uuid } from 'uuid'
import { dbGet, dbSet, dbRemove, logActivity } from '@/lib/firebase'
import { uploadImage } from '@/lib/cloudinary'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, EmptyState, Spinner, Skeleton } from '@/components/ui'

interface GalleryImage {
  id: string
  url: string
  publicId: string
  caption?: string
  eventId?: string
  eventTitle?: string
  uploadedAt: number
  uploadedBy: string
  uploadedByEmail: string
  width: number
  height: number
}

interface EventOption { id: string; title: string }

export function GalleryManager() {
  const { user, profile } = useAuth()
  const [images, setImages] = useState<GalleryImage[]>([])
  const [events, setEvents] = useState<EventOption[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadQueue, setUploadQueue] = useState<{ file: File; preview: string }[]>([])
  const [selectedEvent, setSelectedEvent] = useState('')
  const [caption, setCaption] = useState('')
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [gallData, evData] = await Promise.all([
      dbGet<Record<string, GalleryImage>>('gallery'),
      dbGet<Record<string, { title: string }>>('events'),
    ])
    if (gallData) {
      setImages(
        Object.entries(gallData)
          .map(([id, v]) => ({ ...v, id }))
          .sort((a, b) => b.uploadedAt - a.uploadedAt)
      )
    } else { setImages([]) }
    if (evData) {
      setEvents(Object.entries(evData).map(([id, v]) => ({ id, title: v.title })))
    }
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const previews = files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))
    setUploadQueue((prev) => [...prev, ...previews])
    e.target.value = ''
  }

  function removeFromQueue(idx: number) {
    setUploadQueue((prev) => prev.filter((_, i) => i !== idx))
  }

  async function uploadAll() {
    if (!user || !profile || uploadQueue.length === 0) return
    setUploading(true)
    const eventObj = events.find((e) => e.id === selectedEvent)

    let completed = 0
    for (const item of uploadQueue) {
      try {
        const res = await uploadImage(item.file, 'gallery', (p) => {
          setUploadProgress(Math.round((completed / uploadQueue.length) * 100 + p / uploadQueue.length))
        })
        const id = uuid()
        const img: GalleryImage = {
          id,
          url: res.secure_url,
          publicId: res.public_id,
          caption: caption.trim() || undefined,
          eventId: selectedEvent || undefined,
          eventTitle: eventObj?.title,
          uploadedAt: Date.now(),
          uploadedBy: user.uid,
          uploadedByEmail: profile.email,
          width: res.width,
          height: res.height,
        }
        await dbSet(`gallery/${id}`, img)
        await logActivity({
          userUid: user.uid, userEmail: profile.email, role: profile.role,
          action: 'UPLOAD_GALLERY_IMAGE', targetResource: 'gallery', targetId: id,
          details: eventObj ? `Event: ${eventObj.title}` : undefined,
        })
        completed++
        setUploadProgress(Math.round((completed / uploadQueue.length) * 100))
      } catch {
        toast.error(`Failed to upload ${item.file.name}`)
      }
    }

    toast.success(`${completed} image${completed !== 1 ? 's' : ''} uploaded.`)
    setUploadQueue([])
    setCaption('')
    setSelectedEvent('')
    setUploadProgress(0)
    setUploading(false)
    load()
  }

  async function deleteImage(img: GalleryImage) {
    if (!user || !profile) return
    if (!confirm('Delete this image? This cannot be undone.')) return
    setDeleting(img.id)
    await dbRemove(`gallery/${img.id}`)
    await logActivity({
      userUid: user.uid, userEmail: profile.email, role: profile.role,
      action: 'DELETE_GALLERY_IMAGE', targetResource: 'gallery', targetId: img.id,
    })
    toast.success('Image deleted.')
    setDeleting(null)
    load()
  }

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (lightbox === null) return
      if (e.key === 'ArrowRight') setLightbox((v) => v !== null ? Math.min(v + 1, images.length - 1) : null)
      if (e.key === 'ArrowLeft') setLightbox((v) => v !== null ? Math.max(v - 1, 0) : null)
      if (e.key === 'Escape') setLightbox(null)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [lightbox, images.length])

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="Gallery"
        description={`${images.length} image${images.length !== 1 ? 's' : ''} uploaded`}
        action={
          <button onClick={() => fileRef.current?.click()} className="btn-primary">
            <Plus size={16} /> Add Images
          </button>
        }
      />

      {/* Upload panel */}
      <AnimatePresence>
        {uploadQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="card mb-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-surface-100">{uploadQueue.length} image{uploadQueue.length !== 1 ? 's' : ''} ready to upload</p>
              <button onClick={() => setUploadQueue([])} className="text-surface-500 hover:text-surface-300"><X size={16} /></button>
            </div>

            {/* Previews */}
            <div className="flex gap-2 flex-wrap">
              {uploadQueue.map((item, i) => (
                <div key={i} className="relative group">
                  <img src={item.preview} alt="" className="w-16 h-16 rounded-xl object-cover border border-surface-700" />
                  <button
                    onClick={() => removeFromQueue(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}
            </div>

            {/* Options */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Link to Event (optional)</label>
                <select className="input text-sm" value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
                  <option value="">No event</option>
                  {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Caption (optional)</label>
                <input className="input text-sm" placeholder="Applied to all images" value={caption} onChange={(e) => setCaption(e.target.value)} />
              </div>
            </div>

            {uploading && (
              <div>
                <div className="h-1.5 rounded-full bg-surface-800 overflow-hidden">
                  <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-xs text-surface-500 mt-1">Uploading… {uploadProgress}%</p>
              </div>
            )}

            <button onClick={uploadAll} disabled={uploading} className="btn-primary w-full justify-center">
              {uploading ? <Spinner size={16} /> : <><Upload size={16} /> Upload {uploadQueue.length} Image{uploadQueue.length !== 1 ? 's' : ''}</>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={handleFileSelect} />

      {/* Drop zone (when empty) */}
      {!loading && images.length === 0 && uploadQueue.length === 0 && (
        <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-surface-700 rounded-2xl cursor-pointer hover:border-brand-600/50 transition-colors gap-3">
          <Image size={32} className="text-surface-600" />
          <p className="text-surface-400">Click to upload images or drag and drop</p>
          <p className="text-xs text-surface-600">PNG, JPG, WebP supported</p>
          <input type="file" accept="image/*" multiple className="sr-only" onChange={handleFileSelect} />
        </label>
      )}

      {/* Gallery grid */}
      {loading ? (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className={`w-full ${i % 3 === 0 ? 'h-48' : 'h-32'} break-inside-avoid`} />
          ))}
        </div>
      ) : images.length > 0 && (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
          {images.map((img, i) => (
            <div key={img.id} className="break-inside-avoid relative group rounded-xl overflow-hidden border border-surface-800">
              <img
                src={img.url}
                alt={img.caption ?? ''}
                loading="lazy"
                onClick={() => setLightbox(i)}
                className="w-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-[#2b2419]/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="flex justify-end">
                  <button
                    onClick={() => deleteImage(img)}
                    disabled={deleting === img.id}
                    className="w-7 h-7 rounded-lg bg-red-600/80 flex items-center justify-center hover:bg-red-500 transition-colors"
                  >
                    {deleting === img.id ? <Spinner size={12} /> : <Trash2 size={12} className="text-white" />}
                  </button>
                </div>
                {(img.caption || img.eventTitle) && (
                  <div>
                    {img.eventTitle && <p className="text-xs text-brand-700 font-medium truncate">{img.eventTitle}</p>}
                    {img.caption && <p className="text-xs text-surface-300 truncate">{img.caption}</p>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && images[lightbox] && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] bg-[#2b2419]/95 backdrop-blur-xl flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button onClick={(e) => { e.stopPropagation(); setLightbox(null) }} className="absolute top-4 right-4 p-2 rounded-xl bg-surface-800/80 text-surface-300">
            <X size={20} />
          </button>
          {lightbox > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setLightbox((v) => v! - 1) }} className="absolute left-4 p-2 rounded-xl bg-surface-800/80 text-surface-300">
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
            <button onClick={(e) => { e.stopPropagation(); setLightbox((v) => v! + 1) }} className="absolute right-4 p-2 rounded-xl bg-surface-800/80 text-surface-300">
              <ChevronRight size={24} />
            </button>
          )}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
            {images[lightbox].eventTitle && <p className="text-brand-700 text-sm font-medium">{images[lightbox].eventTitle}</p>}
            {images[lightbox].caption && <p className="text-surface-300 text-sm">{images[lightbox].caption}</p>}
            <p className="text-surface-600 text-xs mt-1">{lightbox + 1} / {images.length} · {formatDate(images[lightbox].uploadedAt)}</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
