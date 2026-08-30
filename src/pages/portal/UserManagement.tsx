import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Shield, Plus, Edit2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, dbGet, dbUpdate, logActivity } from '@/lib/firebase'
import { formatDateTime, ROLE_LABELS, type UserRole } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, EmptyState, Modal, Spinner, StatusBadge } from '@/components/ui'

interface UserProfile {
  uid: string
  email: string
  role: UserRole
  displayName?: string
  createdAt?: number
  lastLogin?: number
  isActive?: boolean
}

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Min 8 characters'),
  role: z.enum(['admin', 'treasurer', 'auditor']),
  displayName: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const ROLE_COLORS: Record<string, string> = {
  admin: 'badge-purple',
  treasurer: 'badge-gold',
  auditor: 'badge-green',
  public: 'badge-gray',
}

export function UserManagement() {
  const { user: currentUser, profile: currentProfile } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<UserProfile | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('treasurer')
  const [updatingRole, setUpdatingRole] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'treasurer' },
  })

  async function load() {
    const data = await dbGet<Record<string, UserProfile>>('users')
    if (data) {
      setUsers(
        Object.entries(data)
          .map(([uid, v]) => ({ ...v, uid }))
          .filter((u) => u.role !== 'public')
          .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      )
    } else {
      setUsers([])
    }
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  async function onCreate(values: FormValues) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, values.email, values.password)
      const profile: UserProfile = {
        uid: cred.user.uid,
        email: values.email,
        role: values.role,
        displayName: values.displayName,
        createdAt: Date.now(),
        isActive: true,
      }
      await dbUpdate(`users/${cred.user.uid}`, profile as unknown as Record<string, unknown>)
      await logActivity({
        userUid: currentUser!.uid,
        userEmail: currentProfile!.email,
        role: currentProfile!.role,
        action: 'CREATE_USER',
        targetResource: 'users',
        targetId: cred.user.uid,
        newValue: { email: values.email, role: values.role },
      })
      toast.success('Officer account created.')
      reset()
      setShowCreate(false)
      load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create user'
      toast.error(msg.includes('email-already-in-use') ? 'Email already registered.' : msg)
    }
  }

  async function updateRole() {
    if (!editUser) return
    setUpdatingRole(true)
    try {
      await dbUpdate(`users/${editUser.uid}`, { role: editRole })
      await logActivity({
        userUid: currentUser!.uid,
        userEmail: currentProfile!.email,
        role: currentProfile!.role,
        action: 'UPDATE_USER_ROLE',
        targetResource: 'users',
        targetId: editUser.uid,
        previousValue: { role: editUser.role },
        newValue: { role: editRole },
      })
      toast.success('Role updated.')
      setEditUser(null)
      load()
    } finally {
      setUpdatingRole(false)
    }
  }

  async function toggleActive(u: UserProfile) {
    const newActive = !u.isActive
    await dbUpdate(`users/${u.uid}`, { isActive: newActive })
    await logActivity({
      userUid: currentUser!.uid,
      userEmail: currentProfile!.email,
      role: currentProfile!.role,
      action: newActive ? 'ENABLE_USER' : 'DISABLE_USER',
      targetResource: 'users',
      targetId: u.uid,
    })
    toast.success(`Account ${newActive ? 'enabled' : 'disabled'}.`)
    load()
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="User Management"
        description="Manage officer accounts and role assignments."
        action={
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> Add Officer
          </button>
        }
      />

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-surface-500 text-sm">Loading…</div>
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No officers yet" description="Add the first officer account." />
        ) : (
          <div className="divide-y divide-surface-800/60">
            {users.map((u) => (
              <div key={u.uid} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-800/20 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                  {(u.displayName ?? u.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-surface-100">{u.displayName ?? u.email.split('@')[0]}</p>
                    {!u.isActive && <span className="badge-red text-[10px]">Disabled</span>}
                    {u.uid === currentUser?.uid && <span className="badge-gray text-[10px]">You</span>}
                  </div>
                  <p className="text-xs text-surface-500 truncate">{u.email}</p>
                  {u.lastLogin && (
                    <p className="text-xs text-surface-600 mt-0.5">Last login: {formatDateTime(u.lastLogin)}</p>
                  )}
                </div>
                <span className={ROLE_COLORS[u.role] + ' hidden sm:inline-flex'}>
                  {ROLE_LABELS[u.role] ?? u.role}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditUser(u); setEditRole(u.role) }}
                    className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all"
                    title="Change role"
                    disabled={u.uid === currentUser?.uid}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => toggleActive(u)}
                    className={`p-1.5 rounded-lg transition-all ${u.isActive ? 'text-emerald-600 hover:bg-emerald-900/20' : 'text-red-600 hover:bg-red-900/20'}`}
                    title={u.isActive ? 'Disable account' : 'Enable account'}
                    disabled={u.uid === currentUser?.uid}
                  >
                    {u.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create officer modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset() }} title="Add Officer Account" size="md">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" placeholder="officer@section.edu" {...register('email')} />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Temporary Password</label>
            <input type="password" className="input" placeholder="Min 8 characters" {...register('password')} />
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <label className="label">Display Name (optional)</label>
            <input className="input" placeholder="Full name" {...register('displayName')} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" {...register('role')}>
              <option value="treasurer">Treasurer</option>
              <option value="auditor">Auditor</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowCreate(false); reset() }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? <Spinner size={16} /> : <><Plus size={14} /> Create Account</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit role modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Change Role" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-surface-400">
            Changing role for <span className="text-surface-200 font-medium">{editUser?.email}</span>
          </p>
          <div>
            <label className="label">New Role</label>
            <select
              className="input"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as UserRole)}
            >
              <option value="treasurer">Treasurer</option>
              <option value="auditor">Auditor</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setEditUser(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={updateRole} disabled={updatingRole} className="btn-primary flex-1">
              {updatingRole ? <Spinner size={16} /> : 'Update Role'}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}
