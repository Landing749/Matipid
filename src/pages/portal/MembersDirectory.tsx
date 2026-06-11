import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { v4 as uuid } from 'uuid'
import {
  Users, Plus, Search, X, Edit2, Trash2,
  UserCheck, Crown, BookOpen, Hash, ChevronDown
} from 'lucide-react'
import { dbGet, dbSet, dbRemove, logActivity, dbPush } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, Modal, EmptyState, Spinner } from '@/components/ui'
import { cn } from '@/lib/utils'

interface Member {
  id: string
  lrn: string
  lastName: string
  firstName: string
  middleInitial?: string
  seat?: number
  role?: 'president' | 'vice_president' | 'secretary' | 'treasurer' | 'auditor' | 'pio' | 'none'
  gender?: 'male' | 'female'
  status?: 'active' | 'transferred' | 'dropped'
  notes?: string
  createdAt: number
}

const ROLES = [
  { value: 'none', label: 'None', icon: '—' },
  { value: 'president', label: 'President', icon: '👑' },
  { value: 'vice_president', label: 'Vice President', icon: '⭐' },
  { value: 'secretary', label: 'Secretary', icon: '📋' },
  { value: 'treasurer', label: 'Treasurer', icon: '💰' },
  { value: 'auditor', label: 'Auditor', icon: '🔍' },
  { value: 'pio', label: 'PIO', icon: '📣' },
]

const schema = z.object({
  lrn: z.string().length(12, 'LRN must be 12 digits'),
  lastName: z.string().min(1, 'Required'),
  firstName: z.string().min(1, 'Required'),
  middleInitial: z.string().max(2).optional(),
  seat: z.coerce.number().int().positive().optional().or(z.literal('')),
  role: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(),
  status: z.enum(['active', 'transferred', 'dropped']).default('active'),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function RoleBadge({ role }: { role?: string }) {
  if (!role || role === 'none') return null
  const found = ROLES.find((r) => r.value === role)
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-brand-600/15 text-brand-300">
      {found?.icon} {found?.label}
    </span>
  )
}

function StatusBadgeLocal({ status }: { status?: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-500/15 text-emerald-400',
    transferred: 'bg-yellow-500/15 text-yellow-400',
    dropped: 'bg-red-500/15 text-red-400',
  }
  return (
    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize', map[status ?? 'active'] ?? map['active'])}>
      {status ?? 'active'}
    </span>
  )
}

export function MembersDirectory() {
  const { user, profile, isAdmin } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterGender, setFilterGender] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('active')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'lastName' | 'seat'>('lastName')

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'active', role: 'none' },
  })

  async function load() {
    const data = await dbGet<Record<string, Omit<Member, 'id'>>>('members')
    if (data) {
      setMembers(
        Object.entries(data)
          .map(([id, v]) => ({ ...v, id }))
          .sort((a, b) => a.lastName.localeCompare(b.lastName))
      )
    } else {
      setMembers([])
    }
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  function openAdd() {
    setEditing(null)
    reset({ status: 'active', role: 'none' })
    setShowModal(true)
  }

  function openEdit(member: Member) {
    setEditing(member)
    reset({
      lrn: member.lrn,
      lastName: member.lastName,
      firstName: member.firstName,
      middleInitial: member.middleInitial ?? '',
      seat: member.seat ?? '',
      role: member.role ?? 'none',
      gender: member.gender,
      status: member.status ?? 'active',
      notes: member.notes ?? '',
    })
    setShowModal(true)
  }

  async function onSubmit(values: FormValues) {
    if (!user || !profile) return
    const payload: Omit<Member, 'id'> = {
      lrn: values.lrn,
      lastName: values.lastName.trim(),
      firstName: values.firstName.trim(),
      middleInitial: values.middleInitial?.trim() || undefined,
      seat: values.seat ? Number(values.seat) : undefined,
      role: (values.role as Member['role']) || 'none',
      gender: values.gender,
      status: values.status,
      notes: values.notes?.trim() || undefined,
      createdAt: editing?.createdAt ?? Date.now(),
    }

    if (editing) {
      await dbSet(`members/${editing.id}`, payload)
      await logActivity({
        userUid: user.uid, userEmail: profile.email, role: profile.role,
        action: 'UPDATE_MEMBER', targetResource: 'members', targetId: editing.id,
        previousValue: editing, newValue: payload,
      })
      toast.success('Member updated.')
    } else {
      const id = await dbPush('members', payload)
      await logActivity({
        userUid: user.uid, userEmail: profile.email, role: profile.role,
        action: 'CREATE_MEMBER', targetResource: 'members', targetId: id,
        newValue: payload,
      })
      toast.success('Member added.')
    }
    setShowModal(false)
    await load()
  }

  async function handleDelete(member: Member) {
    if (!user || !profile) return
    if (!confirm(`Remove ${member.firstName} ${member.lastName} from the directory?`)) return
    setDeleting(member.id)
    await dbRemove(`members/${member.id}`)
    await logActivity({
      userUid: user.uid, userEmail: profile.email, role: profile.role,
      action: 'DELETE_MEMBER', targetResource: 'members', targetId: member.id,
    })
    toast.success('Member removed.')
    await load()
    setDeleting(null)
  }

  const filtered = useMemo(() => {
    return members
      .filter((m) => {
        const q = search.toLowerCase()
        const matchSearch = !q || m.lastName.toLowerCase().includes(q) || m.firstName.toLowerCase().includes(q) || m.lrn.includes(q)
        const matchGender = filterGender === 'all' || m.gender === filterGender
        const matchStatus = filterStatus === 'all' || (m.status ?? 'active') === filterStatus
        return matchSearch && matchGender && matchStatus
      })
      .sort((a, b) => {
        if (sortBy === 'seat') return (a.seat ?? 999) - (b.seat ?? 999)
        return a.lastName.localeCompare(b.lastName)
      })
  }, [members, search, filterGender, filterStatus, sortBy])

  const counts = {
    total: members.filter((m) => (m.status ?? 'active') === 'active').length,
    male: members.filter((m) => m.gender === 'male' && (m.status ?? 'active') === 'active').length,
    female: members.filter((m) => m.gender === 'female' && (m.status ?? 'active') === 'active').length,
    officers: members.filter((m) => m.role && m.role !== 'none').length,
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <PageHeader
        title="Members Directory"
        description={`Class roster — ${counts.total} active students`}
        action={
          isAdmin
            ? <button onClick={openAdd} className="btn-primary"><Plus size={15} /> Add Member</button>
            : undefined
        }
      />

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: counts.total, icon: Users },
          { label: 'Male', value: counts.male, icon: UserCheck },
          { label: 'Female', value: counts.female, icon: UserCheck },
          { label: 'Officers', value: counts.officers, icon: Crown },
        ].map((s) => (
          <div key={s.label} className="card py-3 text-center">
            <p className="text-xl font-bold text-surface-100">{s.value}</p>
            <p className="text-xs text-surface-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card py-3 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input
            className="input pl-8 py-1.5 text-sm h-auto"
            placeholder="Search name or LRN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {['all', 'male', 'female'].map((g) => (
            <button key={g} onClick={() => setFilterGender(g)}
              className={cn('px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                filterGender === g ? 'bg-brand-600/20 text-brand-300' : 'bg-surface-800/50 text-surface-400 hover:bg-surface-800'
              )}>
              {g}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {['all', 'active', 'transferred', 'dropped'].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={cn('px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                filterStatus === s ? 'bg-brand-600/20 text-brand-300' : 'bg-surface-800/50 text-surface-400 hover:bg-surface-800'
              )}>
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-surface-500">Sort:</span>
          <button onClick={() => setSortBy(sortBy === 'lastName' ? 'seat' : 'lastName')}
            className="flex items-center gap-1 text-xs text-surface-400 hover:text-surface-200 transition-colors px-2 py-1 rounded-lg bg-surface-800/50">
            {sortBy === 'lastName' ? 'Name' : 'Seat #'} <ChevronDown size={10} />
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card p-8 text-center text-surface-500 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'No matches found' : 'No members yet'}
          description={search ? 'Try a different name or LRN.' : 'Add students to build your class directory.'}
          action={!search && isAdmin ? <button onClick={openAdd} className="btn-primary"><Plus size={14} />Add Member</button> : undefined}
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800/60">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-surface-500">#</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-surface-500">Name</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-surface-500">LRN</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-surface-500">Role</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-surface-500">Gender</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-surface-500">Status</th>
                  {isAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((member, i) => (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: i * 0.015 }}
                    className="table-row"
                  >
                    <td className="px-4 py-3 text-surface-500 text-xs font-mono">{member.seat ?? '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-surface-100 font-medium">
                        {member.lastName}, {member.firstName}{member.middleInitial ? ` ${member.middleInitial}.` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-surface-400 font-mono text-xs">{member.lrn}</td>
                    <td className="px-4 py-3"><RoleBadge role={member.role} /></td>
                    <td className="px-4 py-3 text-surface-400 capitalize text-xs">{member.gender ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadgeLocal status={member.status} /></td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(member)}
                            className="p-1.5 rounded-lg text-surface-500 hover:text-brand-400 hover:bg-surface-800 transition-all">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDelete(member)} disabled={deleting === member.id}
                            className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-surface-800 transition-all">
                            {deleting === member.id ? <Spinner size={13} /> : <Trash2 size={13} />}
                          </button>
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-surface-800/60 text-xs text-surface-500">
            Showing {filtered.length} of {members.length} members
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Member' : 'Add Member'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">LRN (12 digits)</label>
              <input className="input font-mono" placeholder="000000000000" maxLength={12} {...register('lrn')} />
              {errors.lrn && <p className="text-xs text-red-400 mt-1">{errors.lrn.message}</p>}
            </div>

            <div>
              <label className="label">Last Name</label>
              <input className="input" placeholder="Dela Cruz" {...register('lastName')} />
              {errors.lastName && <p className="text-xs text-red-400 mt-1">{errors.lastName.message}</p>}
            </div>
            <div>
              <label className="label">First Name</label>
              <input className="input" placeholder="Juan" {...register('firstName')} />
              {errors.firstName && <p className="text-xs text-red-400 mt-1">{errors.firstName.message}</p>}
            </div>

            <div>
              <label className="label">Middle Initial</label>
              <input className="input" placeholder="A" maxLength={2} {...register('middleInitial')} />
            </div>
            <div>
              <label className="label">Seat #</label>
              <input type="number" className="input" placeholder="1" {...register('seat')} />
            </div>

            <div>
              <label className="label">Gender</label>
              <select className="input" {...register('gender')}>
                <option value="">— Select —</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="label">Class Role</label>
              <select className="input" {...register('role')}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.icon} {r.label}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="label">Status</label>
              <div className="flex rounded-xl overflow-hidden border border-surface-700/60">
                {(['active', 'transferred', 'dropped'] as const).map((s) => (
                  <label key={s} className="flex-1 flex items-center justify-center py-2 text-xs font-medium cursor-pointer transition-all capitalize">
                    <input type="radio" value={s} {...register('status')} className="sr-only" />
                    <span>{s}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="col-span-2">
              <label className="label">Notes (optional)</label>
              <textarea className="input h-16 resize-none text-sm" placeholder="Any remarks…" {...register('notes')} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? <Spinner size={16} /> : editing ? 'Save Changes' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  )
}
