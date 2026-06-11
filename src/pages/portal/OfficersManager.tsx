import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Plus, Edit2, Trash2, Upload, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { dbGet, dbSet, dbRemove, logActivity } from '@/lib/firebase'
import { uploadImage } from '@/lib/cloudinary'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, EmptyState, Modal, Spinner, Skeleton } from '@/components/ui'

interface Officer {
  id: string
  name: string
  position: string
  photoUrl?: string
  email?: string
  order: number
}

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  position: z.string().min(1, 'Position is required'),
  email: z.string().email('Valid email').optional().or(z.literal('')),
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
    reset({ name: '', position: '', email: '' })
    setPhotoFile(null)
    setPhotoPreview(null)
    setShowModal(true)
  }

  function openEdit(officer: Officer) {
    setEditing(officer)
    reset({ name: officer.name, position: officer.position, email: officer.email ?? '' })
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
      const updated = { ...editing, ...values, photoUrl, email: values.email || undefined }
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
        photoUrl,
        order: officers.length,
      }
      await dbSet(`officers/${id}`, officer)
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

  const POSITIONS = [
    'President', 'Vice President', 'Secretary', 'Assistant Secretary',
    'Treasurer', 'Assistant Treasurer', 'Auditor', 'P.R.O.',
    'Representative', 'Sergeant-at-Arms', 'Muse', 'Supreme Student Government Rep',
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="Officers"
        description={`${officers.length} officer${officers.length !== 1 ? 's' : ''} listed`}
        action={
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> Add Officer
          </button>
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {officers.map((officer, i) => (
            <motion.div
              key={officer.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card-hover flex items-center gap-4 group"
            >
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
                <p className="text-xs text-brand-400 truncate">{officer.position}</p>
                {officer.email && <p className="text-xs text-surface-600 truncate">{officer.email}</p>}
              </div>
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(officer)} className="p-1.5 rounded-lg text-surface-500 hover:text-brand-400 hover:bg-brand-600/10 transition-all">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => deleteOfficer(officer)} disabled={deleting === officer.id} className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-600/10 transition-all">
                  {deleting === officer.id ? <Spinner size={13} /> : <Trash2 size={13} />}
                </button>
              </div>
            </motion.div>
          ))}
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
          <div className="flex justify-center">
            <label className="relative cursor-pointer group">
              {photoPreview ? (
                <img src={photoPreview} alt="Photo" className="w-24 h-24 rounded-full object-cover border-2 border-surface-600 group-hover:border-brand-500 transition-colors" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-surface-800 border-2 border-dashed border-surface-600 group-hover:border-brand-500 flex flex-col items-center justify-center gap-1 transition-colors">
                  <Upload size={16} className="text-surface-500" />
                  <span className="text-xs text-surface-600">Photo</span>
                </div>
              )}
              <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} />
            </label>
          </div>

          <div>
            <label className="label">Full Name</label>
            <input className="input" placeholder="Juan dela Cruz" {...register('name')} />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Position</label>
            <input className="input" placeholder="e.g. President" list="positions-list" {...register('position')} />
            <datalist id="positions-list">
              {POSITIONS.map((p) => <option key={p} value={p} />)}
            </datalist>
            {errors.position && <p className="text-xs text-red-400 mt-1">{errors.position.message}</p>}
          </div>

          <div>
            <label className="label">Email (optional)</label>
            <input type="email" className="input" placeholder="juan@section.edu" {...register('email')} />
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
