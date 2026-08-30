import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Camera, Upload, CheckCircle2, X } from 'lucide-react'
import { dbGet } from '@/lib/firebase'
import { uploadImage } from '@/lib/cloudinary'
import { submitPhoto } from '@/lib/community'
import { Spinner } from '@/components/ui'

interface EventOption { id: string; title: string }

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB

export function SharePhotos() {
  const [searchParams] = useSearchParams()
  const [events, setEvents] = useState<EventOption[]>([])
  const [eventId, setEventId] = useState(searchParams.get('event') ?? '')
  const [name, setName] = useState('')
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    dbGet<Record<string, { title: string }>>('events').then((data) => {
      if (data) setEvents(Object.entries(data).map(([id, v]) => ({ id, title: v.title })))
    })
  }, [])

  function handleFile(f: File | null) {
    if (!f) {
      setFile(null)
      setPreview(null)
      return
    }
    if (!f.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }
    if (f.size > MAX_FILE_BYTES) {
      toast.error('That photo is too large — please choose one under 10MB.')
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      toast.error('Please choose a photo first.')
      return
    }
    setSubmitting(true)
    setProgress(0)
    try {
      const res = await uploadImage(file, 'submissions', setProgress)
      const chosenEvent = events.find((ev) => ev.id === eventId)
      await submitPhoto({
        url: res.secure_url,
        publicId: res.public_id,
        width: res.width,
        height: res.height,
        name,
        caption,
        eventId: chosenEvent?.id,
        eventTitle: chosenEvent?.title,
      })
      setSent(true)
      setFile(null)
      setPreview(null)
      setCaption('')
    } catch {
      toast.error('Upload failed — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600/20 flex items-center justify-center">
            <Camera size={17} className="text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100">Share Your Photos</h1>
        </div>
        <p className="text-sm text-surface-500 mb-8">
          Got a good shot from an event? Send it in! An officer reviews every photo before it appears
          in the public Gallery, so nothing goes live automatically.
        </p>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card flex flex-col items-center text-center gap-3 py-10"
          >
            <CheckCircle2 size={32} className="text-clay-600" />
            <p className="font-semibold text-surface-100">Thanks — your photo was sent for review.</p>
            <button onClick={() => setSent(false)} className="text-sm text-brand-600 hover:text-brand-500 transition-colors">
              Send another
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <label className="label">Photo</label>
              {preview ? (
                <div className="relative rounded-xl overflow-hidden aspect-video bg-surface-950/60">
                  <img src={preview} alt="Selected preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleFile(null)}
                    aria-label="Remove selected photo"
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-surface-950/80 text-surface-200 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 aspect-video rounded-xl border-2 border-dashed border-surface-700 hover:border-brand-600/60 cursor-pointer transition-colors">
                  <Upload size={20} className="text-surface-500" />
                  <span className="text-sm text-surface-500">Tap to choose a photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            </div>

            {events.length > 0 && (
              <div>
                <label className="label">Which event? (optional)</label>
                <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="input">
                  <option value="">Not tied to a specific event</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="label">Your name (optional)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="Leave blank to stay anonymous"
                className="input"
              />
            </div>

            <div>
              <label className="label">Caption (optional)</label>
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={500}
                placeholder="What's happening in this photo?"
                className="input"
              />
            </div>

            <button type="submit" disabled={submitting || !file} className="btn-primary w-full justify-center gap-2">
              {submitting ? <Spinner size={16} /> : <><Upload size={16} /> Send for review</>}
            </button>
            {submitting && progress > 0 && (
              <div className="h-1.5 rounded-full bg-surface-800 overflow-hidden">
                <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </form>
        )}
      </motion.div>
    </div>
  )
}
