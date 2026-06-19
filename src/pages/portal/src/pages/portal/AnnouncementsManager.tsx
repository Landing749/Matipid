import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Megaphone, Plus, Pin, PinOff, Trash2, Edit2, Upload, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { dbGet, dbSet, dbUpdate, dbRemove, logActivity, saveVersion } from '@/lib/firebase'
import { uploadImage } from '@/lib/cloudinary'
import { formatDate, formatDateTime } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, EmptyState, Modal, Spinner, Skeleton } from '@/components/ui'

interface Announcement {
  id: string
  title: string
  content: string
  coverImage?: string
  author: string
  authorUid: string
  createdAt: number
  updatedAt: number
  pinned: boolean
}

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  author: z.string().min(1, 'Author is required'),
  pinned: z.boolean().optional(),
})
type FormValues = z.infer<typeof schema>

export function AnnouncementsManager() {
  const { user, profile } = useAuth()
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { pinned: false, author: profile?.email?.split('@')[0] ?? '' },
  })

  async function load() {
    const data = await dbGet<Record<string, Announcement>>('announcements')
    if (data) {
      setItems(
        Object.entries(data)
          .map(([id, v]) => ({ ...v, id }))
          .sort((a, b) => {
            if (a.pinned && !b.pinned) return -1
            if (!a.pinned && b.pinned) return 1
            return b.createdAt - a.createdAt
          })
      )
    } else {
      setItems([])
    }
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  function openCreate() {
    setEditing(null)
    reset({ pinned: false, author: profile?.email?.split('@')[0] ?? '' })
    setCoverFile(null)
    setCoverPreview(null)
    setShowModal(true)
  }

  function openEdit(item: Announcement) {
    setEditing(item)
    reset({ title: item.title, content: item.content, author: item.author, pinned: item.pinned })
    setCoverFile(null)
    setCoverPreview(item.coverImage ?? null)
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
        const res = await uploadImage(coverFile, 'announcements')
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
      const updated = { ...editing, ...values, coverImage, updatedAt: now }
      await dbSet(`announcements/${editing.id}`, updated)
      await saveVersion('announcements', editing.id, updated, user.uid, profile.email)
      await logActivity({
        userUid: user.uid, userEmail: profile.email, role: profile.role,
        action: 'UPDATE_ANNOUNCEMENT', targetResource: 'announcements', targetId: editing.id,
        previousValue: editing, newValue: updated,
      })
      toast.success('Announcement updated.')
    } else {
      const id = uuid()
      const item: Announcement = {
        id, title: values.title, content: values.content,
        author: values.author, authorUid: user.uid,
        coverImage, createdAt: now, updatedAt: now,
        pinned: values.pinned ?? false,
      }
      await dbSet(`announcements/${id}`, item)
      await saveVersion('announcements', id, item, user.uid, profile.email)
      await logActivity({
        userUid: user.uid, userEmail: profile.email, role: profile.role,
        action: 'CREATE_ANNOUNCEMENT', targetResource: 'announcements', targetId: id, newValue: item,
      })
      toast.success('Announcement posted.')
    }

    setShowModal(false)
    reset()
    setCoverFile(null)
    setCoverPreview(null)
    setEditing(null)
    load()
  }

  async function togglePin(item: Announcement) {
    await dbUpdate(`announcements/${item.id}`, { pinned: !item.pinned, updatedAt: Date.now() })
    toast.success(item.pinned ? 'Unpinned.' : 'Pinned to top.')
    load()
  }

  async function deleteItem(item: Announcement) {
    if (!user || !profile) return
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return
    setDeleting(item.id)
    await dbRemove(`announcements/${item.id}`)
    await logActivity({
      userUid: user.uid, userEmail: profile.email, role: profile.role,
      action: 'DELETE_ANNOUNCEMENT', targetResource: 'announcements', targetId: item.id,
    })
    toast.success('Announcement deleted.')
    setDeleting(null)
    load()
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="Announcements"
        description="Post and manage section announcements."
        action={
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> New Announcement
          </button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements yet" description="Post the first one." action={<button onClick={openCreate} className="btn-primary"><Plus size={14} /> Post Announcement</button>} />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="card-hover flex gap-4">
              {item.coverImage && (
                <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden">
                  <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1">
                  {item.pinned && <span className="badge-gold flex-shrink-0"><Pin size={10} /> Pinned</span>}
                  <p className="text-sm font-semibold text-surface-100 truncate">{item.title}</p>
                </div>
                <p className="text-xs text-surface-400 line-clamp-2 mb-2">{item.content}</p>
                <p className="text-xs text-surface-600">{item.author} · {formatDate(item.createdAt)}</p>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button onClick={() => togglePin(item)} className="p-1.5 rounded-lg text-surface-500 hover:text-gold-400 hover:bg-gold-500/10 transition-all" title={item.pinned ? 'Unpin' : 'Pin'}>
                  {item.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                </button>
                <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-surface-500 hover:text-brand-400 hover:bg-brand-600/10 transition-all">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => deleteItem(item)} disabled={deleting === item.id} className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-600/10 transition-all">
                  {deleting === item.id ? <Spinner size={14} /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(null); reset(); setCoverFile(null); setCoverPreview(null) }}
        title={editing ? 'Edit Announcement' : 'New Announcement'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Cover image */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label !mb-0">Cover Image</label>
              <span className="text-[11px] text-surface-500 bg-surface-800/60 px-2 py-0.5 rounded-md">
                Recommended: 1200 × 630 px · 16:9 · max 2 MB
              </span>
            </div>
            <label className="relative block cursor-pointer group mt-1">
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
            <label className="label">Title</label>
            <input className="input" placeholder="Announcement title" {...register('title')} />
            {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="label">Content</label>
            <textarea className="input h-32 resize-none" placeholder="Write the full announcement here…" {...register('content')} />
            {errors.content && <p className="text-xs text-red-400 mt-1">{errors.content.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Author</label>
              <input className="input" placeholder="Your name" {...register('author')} />
              {errors.author && <p className="text-xs text-red-400 mt-1">{errors.author.message}</p>}
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded accent-brand-500" {...register('pinned')} />
                <span className="text-sm text-surface-300">Pin to top</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setEditing(null); reset() }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting || uploading} className="btn-primary flex-1">
              {isSubmitting || uploading ? <Spinner size={16} /> : editing ? 'Save Changes' : 'Post Announcement'}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  )
}
