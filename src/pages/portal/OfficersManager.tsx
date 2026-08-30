import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Edit2, Trash2, Upload, GripVertical, ChevronUp, ChevronDown, ChevronDown as ChevronExpand, Quote } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { dbGet, dbSet, dbUpdate, dbRemove, logActivity } from '@/lib/firebase'
import { uploadImage } from '@/lib/cloudinary'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { PageHeader, EmptyState, Modal, Spinner, Skeleton } from '@/components/ui'

interface Officer {
  id: string
  name: string
  position: string
  photoUrl?: string
  email?: string
  bio?: string
  order: number
}

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  position: z.string().min(1, 'Position is required'),
  email: z.union([z.string().email('Enter a valid email'), z.literal('')]).optional(),
  bio: z.string().max(400, 'Keep it under 400 characters').optional(),
})
type FormValues = z.infer<typeof schema>

export function OfficersManager() {
  const { user, profile } = useAuth()
  const [officers, setOfficers] = useState<Officer[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Officer | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)

  // drag-to-reorder state
  const dragId = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function load() {
    const data = await dbGet<Record<string, Officer>>('officers')
    if (data) {
      setOfficers(
        Object.entries(data)
          .map(([id, v]) => ({ ...v, id }))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      )
    } else { setOfficers([]) }
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  function openCreate() {
    setEditing(null)
    reset({ name: '', position: '', email: '', bio: '' })
    setPhotoFile(null)
    setPhotoPreview(null)
    setShowModal(true)
  }

  function openEdit(officer: Officer) {
    setEditing(officer)
    reset({ name: officer.name, position: officer.position, email: officer.email ?? '', bio: officer.bio ?? '' })
    setPhotoFile(null)
    setPhotoPreview(officer.photoUrl ?? null)
    setShowModal(true)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  async function onSubmit(values: FormValues) {
    if (!user || !profile) return

    let photoUrl = editing?.photoUrl
    if (photoFile) {
      setUploading(true)
      try {
        const res = await uploadImage(photoFile, 'logos')
        photoUrl = res.secure_url
      } catch {
        toast.error('Photo upload failed.')
        setUploading(false)
        return
      }
      setUploading(false)
    }

    if (editing) {
      const updated = JSON.parse(JSON.stringify({
        ...editing, ...values, photoUrl,
        email: values.email || undefined,
        bio: values.bio || undefined,
      }))
      await dbSet(`officers/${editing.id}`, updated)
      await logActivity({
        userUid: user.uid, userEmail: profile.email, role: profile.role,
        action: 'UPDATE_OFFICER', targetResource: 'officers', targetId: editing.id,
      })
      toast.success('Officer updated.')
    } else {
      const id = uuid()
      const officer: Officer = {
        id,
        name: values.name,
        position: values.position,
        email: values.email || undefined,
        bio: values.bio || undefined,
        photoUrl,
        order: officers.length,
      }
      await dbSet(`officers/${id}`, JSON.parse(JSON.stringify(officer)))
      await logActivity({
        userUid: user.uid, userEmail: profile.email, role: profile.role,
        action: 'CREATE_OFFICER', targetResource: 'officers', targetId: id,
      })
      toast.success('Officer added.')
    }

    setShowModal(false)
    reset()
    setEditing(null)
    setPhotoFile(null)
    setPhotoPreview(null)
    load()
  }

  async function deleteOfficer(officer: Officer) {
    if (!user || !profile) return
    if (!confirm(`Remove ${officer.name} from the officer list?`)) return
    setDeleting(officer.id)
    await dbRemove(`officers/${officer.id}`)
    await logActivity({
      userUid: user.uid, userEmail: profile.email, role: profile.role,
      action: 'DELETE_OFFICER', targetResource: 'officers', targetId: officer.id,
    })
    toast.success('Officer removed.')
    setDeleting(null)
    load()
  }

  // ─── Reordering ────────────────────────────────────────────────────────────

  async function persistOrder(list: Officer[]) {
    setOfficers(list)
    const updates: Record<string, number> = {}
    list.forEach((o, i) => { updates[`officers/${o.id}/order`] = i })
    setReordering(true)
    try {
      await dbUpdate('/', updates)
      if (user && profile) {
        await logActivity({
          userUid: user.uid, userEmail: profile.email, role: profile.role,
          action: 'REORDER_OFFICERS', targetResource: 'officers',
        })
      }
    } finally {
      setReordering(false)
    }
  }

  function moveOfficer(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= officers.length) return
    const next = [...officers]
    ;[next[index], next[target]] = [next[target], next[index]]
    persistOrder(next)
  }

  function handleDragStart(id: string) {
    dragId.current = id
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    if (id !== dragOverId) setDragOverId(id)
  }

  function handleDrop(targetId: string) {
    const sourceId = dragId.current
    dragId.current = null
    setDragOverId(null)
    if (!sourceId || sourceId === targetId) return

    const sourceIdx = officers.findIndex((o) => o.id === sourceId)
    const targetIdx = officers.findIndex((o) => o.id === targetId)
    if (sourceIdx === -1 || targetIdx === -1) return

    const next = [...officers]
    const [moved] = next.splice(sourceIdx, 1)
    next.splice(targetIdx, 0, moved)
    persistOrder(next)
  }

  const POSITIONS = [
    'President', 'Vice President', 'Secretary', 'Assistant Secretary',
    'Treasurer', 'Assistant Treasurer', 'Auditor', 'P.R.O.',
    'Representative', 'Sergeant-at-Arms', 'Muse', 'Supreme Student Government Rep',
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="Officers"
        description={`${officers.length} officer${officers.length !== 1 ? 's' : ''} listed · drag the handle to reorder the hierarchy`}
        action={
          <div className="flex items-center gap-2">
            {reordering && <Spinner size={14} />}
            <button onClick={openCreate} className="btn-primary">
              <Plus size={16} /> Add Officer
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card flex items-center gap-4">
              <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : officers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No officers yet"
          description="Add the section officers to display them on the public site."
          action={<button onClick={openCreate} className="btn-primary"><Plus size={14} /> Add Officer</button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {officers.map((officer, i) => {
            const isExpanded = expanded === officer.id
            return (
              <motion.div
                key={officer.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                draggable
                onDragStart={() => handleDragStart(officer.id)}
                onDragOver={(e) => handleDragOver(e, officer.id)}
                onDragLeave={() => setDragOverId((cur) => (cur === officer.id ? null : cur))}
                onDrop={() => handleDrop(officer.id)}
                onDragEnd={() => { dragId.current = null; setDragOverId(null) }}
                className={cn(
                  'card-hover group flex flex-col gap-3',
                  dragOverId === officer.id && 'ring-2 ring-brand-500/60'
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Drag handle */}
                  <span className="cursor-grab active:cursor-grabbing text-surface-600 hover:text-surface-300 flex-shrink-0 hidden sm:block" title="Drag to reorder">
                    <GripVertical size={15} />
                  </span>

                  {/* Rank + reorder buttons */}
                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => moveOfficer(i, -1)}
                      disabled={i === 0}
                      className="p-0.5 rounded text-surface-600 hover:text-brand-600 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                      title="Move up"
                    >
                      <ChevronUp size={13} />
                    </button>
                    <span className="text-[10px] font-bold text-surface-600 tabular-nums">#{i + 1}</span>
                    <button
                      onClick={() => moveOfficer(i, 1)}
                      disabled={i === officers.length - 1}
                      className="p-0.5 rounded text-surface-600 hover:text-brand-600 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                      title="Move down"
                    >
                      <ChevronDown size={13} />
                    </button>
                  </div>

                  {officer.photoUrl ? (
                    <img
                      src={officer.photoUrl}
                      alt={officer.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-surface-700 group-hover:border-brand-600 transition-colors flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
                      {officer.name[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-100 truncate">{officer.name}</p>
                    <p className="text-xs text-brand-600 truncate">{officer.position}</p>
                    {officer.email && <p className="text-xs text-surface-600 truncate">{officer.email}</p>}
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => openEdit(officer)} className="p-1.5 rounded-lg text-surface-500 hover:text-brand-600 hover:bg-brand-600/10 transition-all">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => deleteOfficer(officer)} disabled={deleting === officer.id} className="p-1.5 rounded-lg text-surface-500 hover:text-red-600 hover:bg-red-600/10 transition-all">
                      {deleting === officer.id ? <Spinner size={13} /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>

                {officer.bio && (
                  <div className="pl-0 sm:pl-[52px]">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : officer.id)}
                      className="flex items-center gap-1 text-[11px] text-surface-500 hover:text-surface-300 transition-colors"
                    >
                      <Quote size={11} />
                      {isExpanded ? 'Hide bio' : 'Read bio'}
                      <ChevronExpand size={12} className={cn('transition-transform', isExpanded && 'rotate-180')} />
                    </button>
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-xs text-surface-400 leading-relaxed mt-1.5 overflow-hidden"
                        >
                          {officer.bio}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(null); reset(); setPhotoFile(null); setPhotoPreview(null) }}
        title={editing ? 'Edit Officer' : 'Add Officer'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Photo */}
          <div className="flex flex-col items-center gap-1">
            <label className="relative cursor-pointer group">
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="Photo" className="w-24 h-24 rounded-full object-cover border-2 border-surface-600 group-hover:border-brand-500 transition-colors" />
                  <div className="absolute inset-0 rounded-full bg-[#2b2419]/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload size={16} className="text-white" />
                  </div>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-surface-800 border-2 border-dashed border-surface-600 group-hover:border-brand-500 flex flex-col items-center justify-center gap-1 transition-colors">
                  <Upload size={16} className="text-surface-500" />
                  <span className="text-xs text-surface-600">Photo</span>
                </div>
              )}
              <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} />
            </label>
            <span className="text-xs text-surface-600">Optional</span>
          </div>

          <div>
            <label className="label">Full Name</label>
            <input className="input" placeholder="Juan dela Cruz" {...register('name')} />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Position</label>
            <input className="input" placeholder="e.g. President" list="positions-list" {...register('position')} />
            <datalist id="positions-list">
              {POSITIONS.map((p) => <option key={p} value={p} />)}
            </datalist>
            {errors.position && <p className="text-xs text-red-600 mt-1">{errors.position.message}</p>}
          </div>

          <div>
            <label className="label">Email (optional)</label>
            <input type="email" className="input" placeholder="juan@section.edu" {...register('email')} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label !mb-0">Bio (optional)</label>
              <span className="text-[11px] text-surface-500">Shown on their card, public + portal</span>
            </div>
            <textarea
              className="input h-24 resize-none"
              placeholder="A short line about this officer — their role, goals, or a fun fact…"
              {...register('bio')}
            />
            {errors.bio && <p className="text-xs text-red-600 mt-1">{errors.bio.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setEditing(null); reset() }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting || uploading} className="btn-primary flex-1">
              {isSubmitting || uploading ? <Spinner size={16} /> : editing ? 'Save Changes' : 'Add Officer'}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  )
}
