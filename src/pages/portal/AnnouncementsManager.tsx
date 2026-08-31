import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Megaphone, Plus, Pin, PinOff, Trash2, Edit2, Upload, Calendar as CalendarIcon,
  AlertTriangle, Users, Award, Clock, FileText, Copy, Clock3,
} from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { dbGet, dbSet, dbUpdate, dbRemove, logActivity, saveVersion } from '@/lib/firebase'
import { uploadImage } from '@/lib/cloudinary'
import { triggerDeploy, schedulePublish, cancelSchedule } from '@/lib/worker'
import { formatDate, formatDateTime, cn } from '@/lib/utils'
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
  category: string
  status: 'draft' | 'published'
  publishAt?: number
}

// ─── Templates (CMS starting points) ───────────────────────────────────────

interface Template {
  id: string
  label: string
  icon: React.ElementType
  category: string
  title: string
  content: string
  pinned?: boolean
}

const TEMPLATES: Template[] = [
  { id: 'blank', label: 'Blank', icon: FileText, category: 'General', title: '', content: '' },
  {
    id: 'event', label: 'Event Announcement', icon: CalendarIcon, category: 'Event',
    title: 'Upcoming: ',
    content: 'Join us on [date] at [time] for [event name]!\n\nWhere: \nWhat to bring: \nWho can join: ',
  },
  {
    id: 'meeting', label: 'Meeting Reminder', icon: Users, category: 'Meeting',
    title: 'Officer Meeting — ',
    content: 'Reminder: we have an officer meeting on [date] at [time], held [venue/platform].\n\nAgenda:\n1. \n2. \n3. \n\nPlease come prepared and on time.',
    pinned: true,
  },
  {
    id: 'urgent', label: 'Urgent Notice', icon: AlertTriangle, category: 'Urgent',
    title: 'Urgent: ',
    content: 'Please read this carefully:\n\n',
    pinned: true,
  },
  {
    id: 'recognition', label: 'Recognition', icon: Award, category: 'Achievement',
    title: 'Congratulations to ',
    content: 'We\u2019d like to recognize [name] for [achievement].\n\nWell done, and thank you for representing our section well!',
  },
  {
    id: 'deadline', label: 'Deadline Reminder', icon: Clock, category: 'Reminder',
    title: 'Deadline: ',
    content: 'This is a reminder that [task] is due on [date].\n\nDetails:\n',
  },
]

const CATEGORIES = ['General', 'Event', 'Meeting', 'Urgent', 'Achievement', 'Reminder']

const CATEGORY_BADGE: Record<string, string> = {
  General: 'badge-gray',
  Event: 'badge-gold',
  Meeting: 'badge-purple',
  Urgent: 'badge-red',
  Achievement: 'badge-green',
  Reminder: 'badge-yellow',
}

const CATEGORY_ICON_BG: Record<string, string> = {
  General: 'bg-surface-800 text-surface-400',
  Event: 'bg-gold-100 text-gold-700',
  Meeting: 'bg-brand-100 text-brand-700',
  Urgent: 'bg-red-100 text-red-700',
  Achievement: 'bg-clay-100 text-clay-700',
  Reminder: 'bg-gold-100 text-gold-700',
}

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  author: z.string().min(1, 'Author is required'),
  category: z.string().min(1),
  pinned: z.boolean().optional(),
  publishMode: z.enum(['immediate', 'draft', 'scheduled']),
  publishAt: z.string().optional(),
}).refine((v) => v.publishMode !== 'scheduled' || !!v.publishAt, {
  message: 'Pick a date and time to schedule for',
  path: ['publishAt'],
})
type FormValues = z.infer<typeof schema>

function toLocalInputValue(ts: number) {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AnnouncementsManager() {
  const { user, profile } = useAuth()
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { pinned: false, author: profile?.email?.split('@')[0] ?? '', category: 'General', publishMode: 'immediate' },
  })
  const publishMode = watch('publishMode')

  async function load() {
    const data = await dbGet<Record<string, Announcement>>('announcements')
    if (data) {
      setItems(
        Object.entries(data)
          .map(([id, v]) => ({ ...v, id, category: v.category ?? 'General', status: v.status ?? 'published' }))
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
    setShowTemplatePicker(true)
  }

  function pickTemplate(t: Template) {
    reset({
      title: t.title,
      content: t.content,
      author: profile?.email?.split('@')[0] ?? '',
      category: t.category,
      pinned: t.pinned ?? false,
      publishMode: 'immediate',
      publishAt: undefined,
    })
    setCoverFile(null)
    setCoverPreview(null)
    setShowTemplatePicker(false)
    setShowModal(true)
  }

  function openEdit(item: Announcement) {
    setEditing(item)
    const publishMode: FormValues['publishMode'] =
      item.status === 'draft' ? 'draft' : item.publishAt && item.publishAt > Date.now() ? 'scheduled' : 'immediate'
    reset({
      title: item.title,
      content: item.content,
      author: item.author,
      category: item.category ?? 'General',
      pinned: item.pinned,
      publishMode,
      publishAt: item.publishAt ? toLocalInputValue(item.publishAt) : undefined,
    })
    setCoverFile(null)
    setCoverPreview(item.coverImage ?? null)
    setShowModal(true)
  }

  function duplicateItem(item: Announcement) {
    setEditing(null)
    reset({
      title: `${item.title} (Copy)`,
      content: item.content,
      author: profile?.email?.split('@')[0] ?? item.author,
      category: item.category ?? 'General',
      pinned: false,
      publishMode: 'draft',
      publishAt: undefined,
    })
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
    const status: 'draft' | 'published' = values.publishMode === 'draft' ? 'draft' : 'published'
    const publishAt = values.publishMode === 'scheduled' && values.publishAt
      ? new Date(values.publishAt).getTime()
      : undefined

    const id = editing ? editing.id : uuid()

    if (editing) {
      const updated: Announcement = {
        ...editing,
        title: values.title, content: values.content, author: values.author,
        category: values.category, pinned: values.pinned ?? false,
        coverImage, updatedAt: now, status, publishAt,
      }
      await dbSet(`announcements/${editing.id}`, JSON.parse(JSON.stringify(updated)))
      await saveVersion('announcements', editing.id, updated, user.uid, profile.email)
      await logActivity({
        userUid: user.uid, userEmail: profile.email, role: profile.role,
        action: 'UPDATE_ANNOUNCEMENT', targetResource: 'announcements', targetId: editing.id,
        previousValue: editing, newValue: updated,
      })
      toast.success('Announcement updated.')
    } else {
      const item: Announcement = {
        id, title: values.title, content: values.content,
        author: values.author, authorUid: user.uid, category: values.category,
        coverImage, createdAt: now, updatedAt: now,
        pinned: values.pinned ?? false, status, publishAt,
      }
      await dbSet(`announcements/${id}`, JSON.parse(JSON.stringify(item)))
      await saveVersion('announcements', id, item, user.uid, profile.email)
      await logActivity({
        userUid: user.uid, userEmail: profile.email, role: profile.role,
        action: 'CREATE_ANNOUNCEMENT', targetResource: 'announcements', targetId: id, newValue: item,
      })
      toast.success(
        status === 'draft' ? 'Draft saved.' : publishAt ? 'Announcement scheduled.' : 'Announcement posted.'
      )
    }

    // Preview bookkeeping. A save only tells us the *new* state — whether
    // this actually changes what's publicly visible (and therefore needs
    // a rebuild) depends on comparing against what was visible before.
    // This is what catches unpublish (published → draft), which the old
    // `if (status === 'published')` check missed entirely since it never
    // looks at the previous state.
    const wasVisible = !!editing && editing.status === 'published'
      && (!editing.publishAt || editing.publishAt <= now)
    const isVisible = status === 'published' && (!publishAt || publishAt <= now)
    if (wasVisible !== isVisible) triggerDeploy()

    // A future publishAt won't be visible yet, so nothing above fires for
    // it — schedule a one-shot rebuild for the exact moment it will be.
    // Any earlier schedule for this id (from a prior save) is overwritten;
    // if this save no longer needs one, clear it instead.
    if (status === 'published' && publishAt && publishAt > now) {
      schedulePublish(id, publishAt)
    } else if (editing) {
      cancelSchedule(id)
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
    triggerDeploy()
    // Clears any pending publishAt alarm for this id — harmless no-op if
    // it was never scheduled, but without this a scheduled-then-deleted
    // post would still fire a (now pointless) rebuild when its old
    // publishAt time arrived.
    cancelSchedule(item.id)
    setDeleting(null)
    load()
  }

  const visibleItems = categoryFilter ? items.filter((i) => (i.category ?? 'General') === categoryFilter) : items

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="Announcements"
        description="Post, schedule, and manage section announcements."
        action={
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> New Announcement
          </button>
        }
      />

      {/* Category filter chips */}
      {!loading && items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setCategoryFilter(null)}
            className={cn('badge transition-all', categoryFilter === null ? 'badge-purple' : 'badge-gray opacity-60 hover:opacity-100')}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c === categoryFilter ? null : c)}
              className={cn('transition-all', CATEGORY_BADGE[c], categoryFilter && categoryFilter !== c && 'opacity-50 hover:opacity-100')}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : visibleItems.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements yet" description="Post the first one." action={<button onClick={openCreate} className="btn-primary"><Plus size={14} /> Post Announcement</button>} />
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item) => {
            const isScheduled = item.status === 'published' && item.publishAt && item.publishAt > Date.now()
            return (
              <div key={item.id} className="card-hover flex gap-4">
                {item.coverImage && (
                  <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden">
                    <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start flex-wrap gap-1.5 mb-1">
                    {item.pinned && <span className="badge-gold flex-shrink-0"><Pin size={10} /> Pinned</span>}
                    <span className={cn('flex-shrink-0', CATEGORY_BADGE[item.category ?? 'General'])}>{item.category ?? 'General'}</span>
                    {item.status === 'draft' && <span className="badge-gray flex-shrink-0">Draft</span>}
                    {isScheduled && (
                      <span className="badge-purple flex-shrink-0"><Clock3 size={10} /> {formatDateTime(item.publishAt!)}</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-surface-100 truncate">{item.title}</p>
                  <p className="text-xs text-surface-400 line-clamp-2 mb-2 mt-0.5">{item.content}</p>
                  <p className="text-xs text-surface-600">{item.author} · {formatDate(item.createdAt)}</p>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={() => togglePin(item)} className="p-1.5 rounded-lg text-surface-500 hover:text-gold-700 hover:bg-gold-500/10 transition-all" title={item.pinned ? 'Unpin' : 'Pin'}>
                    {item.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                  </button>
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-surface-500 hover:text-brand-600 hover:bg-brand-600/10 transition-all" title="Edit">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => duplicateItem(item)} className="p-1.5 rounded-lg text-surface-500 hover:text-brand-600 hover:bg-brand-600/10 transition-all" title="Duplicate as draft">
                    <Copy size={14} />
                  </button>
                  <button onClick={() => deleteItem(item)} disabled={deleting === item.id} className="p-1.5 rounded-lg text-surface-500 hover:text-red-600 hover:bg-red-600/10 transition-all" title="Delete">
                    {deleting === item.id ? <Spinner size={14} /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Template picker */}
      <Modal open={showTemplatePicker} onClose={() => setShowTemplatePicker(false)} title="Start from a template" size="lg">
        <div className="grid sm:grid-cols-2 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => pickTemplate(t)}
              className="card-hover text-left flex items-start gap-3 group"
            >
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', CATEGORY_ICON_BG[t.category])}>
                <t.icon size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-surface-100 group-hover:text-brand-600 transition-colors">{t.label}</p>
                <p className="text-xs text-surface-500 mt-0.5">{t.id === 'blank' ? 'Start with an empty announcement' : `Pre-filled ${t.category.toLowerCase()} layout`}</p>
              </div>
            </button>
          ))}
        </div>
      </Modal>

      {/* Editor modal */}
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
                  <div className="absolute inset-0 bg-[#2b2419]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
            {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="label">Content</label>
            <textarea className="input h-32 resize-none" placeholder="Write the full announcement here…" {...register('content')} />
            {errors.content && <p className="text-xs text-red-600 mt-1">{errors.content.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Author</label>
              <input className="input" placeholder="Your name" {...register('author')} />
              {errors.author && <p className="text-xs text-red-600 mt-1">{errors.author.message}</p>}
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" {...register('category')}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded accent-brand-500" {...register('pinned')} />
              <span className="text-sm text-surface-300">Pin to top</span>
            </label>
          </div>

          {/* Publish mode */}
          <div>
            <label className="label">Publishing</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'immediate', label: 'Publish now' },
                { value: 'draft', label: 'Save as draft' },
                { value: 'scheduled', label: 'Schedule' },
              ] as const).map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex items-center justify-center text-center text-xs font-medium rounded-lg border px-2 py-2 cursor-pointer transition-all',
                    publishMode === opt.value
                      ? 'border-brand-500 bg-brand-500/10 text-brand-600'
                      : 'border-surface-700 text-surface-400 hover:border-surface-500'
                  )}
                >
                  <input type="radio" value={opt.value} className="sr-only" {...register('publishMode')} />
                  {opt.label}
                </label>
              ))}
            </div>
            {publishMode === 'scheduled' && (
              <div className="mt-3">
                <input type="datetime-local" className="input" {...register('publishAt')} />
                {errors.publishAt && <p className="text-xs text-red-600 mt-1">{errors.publishAt.message}</p>}
                <p className="text-[11px] text-surface-500 mt-1">Stays hidden from the public site until this date and time.</p>
              </div>
            )}
            {publishMode === 'draft' && (
              <p className="text-[11px] text-surface-500 mt-2">Only visible here in the portal until you publish it.</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setEditing(null); reset() }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting || uploading} className="btn-primary flex-1">
              {isSubmitting || uploading ? <Spinner size={16} /> : editing ? 'Save Changes' : 'Save Announcement'}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  )
}
