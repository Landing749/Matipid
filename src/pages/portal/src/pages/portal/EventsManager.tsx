import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Plus, Edit2, Trash2, Upload, MapPin, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { format } from 'date-fns'
import { dbGet, dbSet, dbRemove, logActivity, saveVersion } from '@/lib/firebase'
import { uploadImage } from '@/lib/cloudinary'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, EmptyState, Modal, Spinner, Skeleton } from '@/components/ui'

interface Event {
  id: string
  title: string
  description: string
  date: number
  location?: string
  coverImage?: string
  tags?: string[]
  createdBy: string
  createdByEmail: string
  createdAt: number
  updatedAt: number
}

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  location: z.string().optional(),
  tags: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function EventsManager() {
  const { user, profile } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Event | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function load() {
    const data = await dbGet<Record<string, Event>>('events')
    if (data) {
      setEvents(
        Object.entries(data)
          .map(([id, v]) => ({ ...v, id }))
          .sort((a, b) => b.date - a.date)
      )
    } else { setEvents([]) }
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  function openCreate() {
    setEditing(null)
    reset({ title: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), location: '', tags: '' })
    setCoverFile(null)
    setCoverPreview(null)
    setShowModal(true)
  }

  function openEdit(event: Event) {
    setEditing(event)
    reset({
      title: event.title,
      description: event.description,
      date: format(new Date(event.date), 'yyyy-MM-dd'),
      location: event.location ?? '',
      tags: event.tags?.join(', ') ?? '',
    })
    setCoverFile(null)
    setCoverPreview(event.coverImage ?? null)
    setShowModal(true)
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  async function onSubmit(values: FormValues) {
    if (!user || !profile) return

    let coverImage = editing?.coverImage
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

    if (editing) {
      const updated: Event = {
        ...editing,
        title: values.title,
        description: values.description,
        date: new Date(values.date).getTime(),
        location: values.location || undefined,
        coverImage,
        tags: tags?.length ? tags : undefined,
        updatedAt: now,
      }
      await dbSet(`events/${editing.id}`, updated)
      await saveVersion('events', editing.id, updated, user.uid, profile.email)
      await logActivity({
        userUid: user.uid, userEmail: profile.email, role: profile.role,
        action: 'UPDATE_EVENT', targetResource: 'events', targetId: editing.id,
        previousValue: editing, newValue: updated,
      })
      toast.success('Event updated.')
    } else {
      const id = uuid()
      const event: Event = {
        id,
        title: values.title,
        description: values.description,
        date: new Date(values.date).getTime(),
        location: values.location || undefined,
        coverImage,
        tags: tags?.length ? tags : undefined,
        createdBy: user.uid,
        createdByEmail: profile.email,
        createdAt: now,
        updatedAt: now,
      }
      await dbSet(`events/${id}`, event)
      await saveVersion('events', id, event, user.uid, profile.email)
      await logActivity({
        userUid: user.uid, userEmail: profile.email, role: profile.role,
        action: 'CREATE_EVENT', targetResource: 'events', targetId: id, newValue: event,
      })
      toast.success('Event created.')
    }

    setShowModal(false)
    reset()
    setEditing(null)
    setCoverFile(null)
    setCoverPreview(null)
    load()
  }

  async function deleteEvent(event: Event) {
    if (!user || !profile) return
    if (!confirm(`Delete "${event.title}"? This cannot be undone.`)) return
    setDeleting(event.id)
    await dbRemove(`events/${event.id}`)
    await logActivity({
      userUid: user.uid, userEmail: profile.email, role: profile.role,
      action: 'DELETE_EVENT', targetResource: 'events', targetId: event.id,
    })
    toast.success('Event deleted.')
    setDeleting(null)
    load()
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="Events"
        description={`${events.length} event${events.length !== 1 ? 's' : ''} recorded`}
        action={
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> New Event
          </button>
        }
      />

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card">
              <Skeleton className="h-40 mb-4" />
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No events yet"
          description="Record the first section event."
          action={<button onClick={openCreate} className="btn-primary"><Plus size={14} /> New Event</button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {events.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card-hover p-0 overflow-hidden group"
            >
              {event.coverImage ? (
                <div className="h-40 overflow-hidden">
                  <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              ) : (
                <div className="h-40 bg-gradient-to-br from-brand-900/40 to-surface-800/60 flex items-center justify-center">
                  <Calendar size={32} className="text-surface-600" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-surface-100 flex-1">{event.title}</p>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(event)} className="p-1.5 rounded-lg text-surface-500 hover:text-brand-400 hover:bg-brand-600/10 transition-all">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => deleteEvent(event)} disabled={deleting === event.id} className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-600/10 transition-all">
                      {deleting === event.id ? <Spinner size={13} /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-surface-400 line-clamp-2 mb-2">{event.description}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-surface-500">
                  <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(event.date)}</span>
                  {event.location && <span className="flex items-center gap-1"><MapPin size={11} />{event.location}</span>}
                </div>
                {event.tags && event.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {event.tags.map((tag) => <span key={tag} className="badge-gray text-[10px]">{tag}</span>)}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(null); reset(); setCoverFile(null); setCoverPreview(null) }}
        title={editing ? 'Edit Event' : 'New Event'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Cover image */}
          <div>
            <label className="label">Cover Image</label>
            <label className="relative block cursor-pointer group">
              {coverPreview ? (
                <div className="relative h-36 rounded-xl overflow-hidden border border-surface-700">
                  <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-surface-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload size={20} className="text-white" />
                  </div>
                </div>
              ) : (
                <div className="h-36 rounded-xl border-2 border-dashed border-surface-700 hover:border-brand-600/50 flex flex-col items-center justify-center gap-2 transition-colors">
                  <Upload size={20} className="text-surface-500" />
                  <span className="text-sm text-surface-500">Upload cover image</span>
                </div>
              )}
              <input type="file" accept="image/*" className="sr-only" onChange={handleCoverChange} />
            </label>
          </div>

          <div>
            <label className="label">Event Title</label>
            <input className="input" placeholder="e.g. Foundation Day Celebration" {...register('title')} />
            {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input h-24 resize-none" placeholder="Describe what happened at this event…" {...register('description')} />
            {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" {...register('date')} />
              {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <label className="label">Location (optional)</label>
              <input className="input" placeholder="e.g. School Gymnasium" {...register('location')} />
            </div>
          </div>

          <div>
            <label className="label">Tags (optional, comma-separated)</label>
            <input className="input" placeholder="e.g. Academic, Sports, Social" {...register('tags')} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setEditing(null); reset() }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting || uploading} className="btn-primary flex-1">
              {isSubmitting || uploading ? <Spinner size={16} /> : editing ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  )
}
