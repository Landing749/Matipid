import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Plus, Edit2, Trash2, Upload, MapPin } from 'lucide-react'
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

interface TimelineEntry {
  id: string
  title: string
  description: string
  date: number
  location?: string
  coverImage?: string
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
})
type FormValues = z.infer<typeof schema>

export function TimelineManager() {
  const { user, profile } = useAuth()
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<TimelineEntry | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function load() {
    const data = await dbGet<Record<string, TimelineEntry>>('timeline')
    if (data) {
      setEntries(
        Object.entries(data)
          .map(([id, v]) => ({ ...v, id }))
          .sort((a, b) => b.date - a.date)
      )
    } else {
      setEntries([])
    }
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  function openCreate() {
    setEditing(null)
    reset({ title: '', description: '', date: format(new Date(), 'yyyy-MM-dd'), location: '' })
    setCoverFile(null)
    setCoverPreview(null)
    setShowModal(true)
  }

  function openEdit(entry: TimelineEntry) {
    setEditing(entry)
    reset({
      title: entry.title,
      description: entry.description,
      date: format(new Date(entry.date), 'yyyy-MM-dd'),
      location: entry.location ?? '',
    })
    setCoverFile(null)
    setCoverPreview(entry.coverImage ?? null)
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
        const res = await uploadImage(coverFile, 'timeline')
        coverImage = res.secure_url
      } catch {
        toast.error('Image upload failed.')
        setUploading(false)
        return
      }
      setUploading(false)
    }

    const now = Date.now()

    if (editing) {
      const updated: TimelineEntry = {
        ...editing,
        title: values.title,
        description: values.description,
        date: new Date(values.date).getTime(),
        location: values.location || undefined,
        coverImage,
        updatedAt: now,
      }
      const clean = JSON.parse(JSON.stringify(updated))
      await dbSet(`timeline/${editing.id}`, clean)
      await saveVersion('timeline', editing.id, updated, user.uid, profile.email)
      await logActivity({
        userUid: user.uid, userEmail: profile.email, role: profile.role,
        action: 'UPDATE_TIMELINE_ENTRY', targetResource: 'timeline', targetId: editing.id,
        previousValue: editing, newValue: updated,
      })
      toast.success('Timeline entry updated.')
    } else {
      const id = uuid()
      const entry: TimelineEntry = {
        id,
        title: values.title,
        description: values.description,
        date: new Date(values.date).getTime(),
        location: values.location || undefined,
        coverImage,
        createdBy: user.uid,
        createdByEmail: profile.email,
        createdAt: now,
        updatedAt: now,
      }
      const clean = JSON.parse(JSON.stringify(entry))
      await dbSet(`timeline/${id}`, clean)
      await saveVersion('timeline', id, entry, user.uid, profile.email)
      await logActivity({
        userUid: user.uid, userEmail: profile.email, role: profile.role,
        action: 'CREATE_TIMELINE_ENTRY', targetResource: 'timeline', targetId: id, newValue: entry,
      })
      toast.success('Timeline entry added.')
    }

    setShowModal(false)
    reset()
    setEditing(null)
    setCoverFile(null)
    setCoverPreview(null)
    load()
  }

  async function deleteEntry(entry: TimelineEntry) {
    if (!user || !profile) return
    if (!confirm(`Delete "${entry.title}"? This cannot be undone.`)) return
    setDeleting(entry.id)
    await dbRemove(`timeline/${entry.id}`)
    await logActivity({
      userUid: user.uid, userEmail: profile.email, role: profile.role,
      action: 'DELETE_TIMELINE_ENTRY', targetResource: 'timeline', targetId: entry.id,
    })
    toast.success('Entry deleted.')
    setDeleting(null)
    load()
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="Timeline"
        description="Manage the section's story — milestones and key moments."
        action={
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> New Entry
          </button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No timeline entries yet"
          description="Add the first milestone to your section's story."
          action={<button onClick={openCreate} className="btn-primary"><Plus size={14} /> Add Entry</button>}
        />
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-brand-600/50 via-surface-700 to-transparent pointer-events-none" />

          <div className="space-y-2">
            {entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex gap-4 group"
              >
                {/* Dot */}
                <div className="flex-shrink-0 w-9 flex flex-col items-center pt-3.5">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-600 bg-surface-950 group-hover:bg-brand-600 transition-colors z-10" />
                </div>

                {/* Card */}
                <div className="flex-1 card-hover flex gap-3 mb-2">
                  {entry.coverImage && (
                    <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden">
                      <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-brand-400 font-mono mb-0.5">{formatDate(entry.date)}</p>
                    <p className="text-sm font-semibold text-surface-100 truncate">{entry.title}</p>
                    <p className="text-xs text-surface-400 line-clamp-2 mt-0.5">{entry.description}</p>
                    {entry.location && (
                      <p className="text-xs text-surface-500 mt-1 flex items-center gap-1">
                        <MapPin size={10} /> {entry.location}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(entry)}
                      className="p-1.5 rounded-lg text-surface-500 hover:text-brand-400 hover:bg-brand-600/10 transition-all"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => deleteEntry(entry)}
                      disabled={deleting === entry.id}
                      className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-600/10 transition-all"
                    >
                      {deleting === entry.id ? <Spinner size={13} /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(null); reset(); setCoverFile(null); setCoverPreview(null) }}
        title={editing ? 'Edit Timeline Entry' : 'New Timeline Entry'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Cover image */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label !mb-0">Cover Image (optional)</label>
              <span className="text-[11px] text-surface-500 bg-surface-800/60 px-2 py-0.5 rounded-md">
                Recommended: 800 × 450 px · 16:9
              </span>
            </div>
            <label className="relative block cursor-pointer group mt-1">
              {coverPreview ? (
                <div className="relative h-32 rounded-xl overflow-hidden border border-surface-700">
                  <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-surface-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload size={20} className="text-white" />
                  </div>
                </div>
              ) : (
                <div className="h-32 rounded-xl border-2 border-dashed border-surface-700 hover:border-brand-600/50 flex flex-col items-center justify-center gap-2 transition-colors">
                  <Upload size={20} className="text-surface-500" />
                  <span className="text-sm text-surface-500">Upload image</span>
                </div>
              )}
              <input type="file" accept="image/*" className="sr-only" onChange={handleCoverChange} />
            </label>
          </div>

          <div>
            <label className="label">Title</label>
            <input className="input" placeholder="e.g. First General Assembly" {...register('title')} />
            {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input h-28 resize-none"
              placeholder="Describe what happened at this milestone…"
              {...register('description')}
            />
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
              <input className="input" placeholder="e.g. Classroom 8-B" {...register('location')} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowModal(false); setEditing(null); reset(); setCoverFile(null); setCoverPreview(null) }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || uploading} className="btn-primary flex-1">
              {isSubmitting || uploading ? <Spinner size={16} /> : editing ? 'Save Changes' : 'Add Entry'}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  )
}
