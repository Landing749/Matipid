import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { v4 as uuid } from 'uuid'
import { Camera, Check, X as XIcon, Link2, User, Calendar } from 'lucide-react'
import { dbGet, dbSet, dbUpdate, logActivity } from '@/lib/firebase'
import { formatDateTime } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, EmptyState, Spinner, Skeleton } from '@/components/ui'
import type { PhotoSubmission } from '@/lib/community'

const TABS = ['pending', 'approved', 'rejected'] as const

export function PhotoSubmissionsManager() {
  const { user, profile } = useAuth()
  const [submissions, setSubmissions] = useState<PhotoSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<(typeof TABS)[number]>('pending')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function load() {
    const data = await dbGet<Record<string, Omit<PhotoSubmission, 'id'>>>('photoSubmissions')
    setSubmissions(
      data
        ? Object.entries(data)
            .map(([id, v]) => ({ ...v, id }))
            .sort((a, b) => b.createdAt - a.createdAt)
        : []
    )
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  async function copyShareLink() {
    const url = `${window.location.origin}${window.location.pathname}#/share-photos`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('input')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    toast.success('Share link copied.')
    setTimeout(() => setCopied(false), 1500)
  }

  async function approve(s: PhotoSubmission) {
    if (!user || !profile) return
    setBusyId(s.id)
    try {
      const id = uuid()
      await dbSet(`gallery/${id}`, {
        id,
        url: s.url,
        publicId: s.publicId,
        caption: s.caption,
        eventId: s.eventId,
        eventTitle: s.eventTitle,
        uploadedAt: Date.now(),
        uploadedBy: user.uid,
        uploadedByEmail: profile.email,
        width: s.width,
        height: s.height,
      })
      await dbUpdate(`photoSubmissions/${s.id}`, { status: 'approved' })
      await logActivity({
        userUid: user.uid, userEmail: profile.email, role: profile.role,
        action: 'APPROVE_PHOTO_SUBMISSION', targetResource: 'photoSubmissions', targetId: s.id,
        newValue: { galleryId: id },
      })
      toast.success('Photo published to Gallery.')
      await load()
    } catch {
      toast.error('Could not approve — please try again.')
    } finally {
      setBusyId(null)
    }
  }

  async function reject(s: PhotoSubmission) {
    if (!user || !profile) return
    setBusyId(s.id)
    try {
      await dbUpdate(`photoSubmissions/${s.id}`, { status: 'rejected' })
      await logActivity({
        userUid: user.uid, userEmail: profile.email, role: profile.role,
        action: 'REJECT_PHOTO_SUBMISSION', targetResource: 'photoSubmissions', targetId: s.id,
      })
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const filtered = submissions.filter((s) => s.status === tab)

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="Photo Submissions"
        description={`${submissions.filter((s) => s.status === 'pending').length} pending · ${submissions.length} total`}
        action={
          <button onClick={copyShareLink} className="btn-secondary text-xs gap-1.5">
            {copied ? <Check size={13} className="text-green-500" /> : <Link2 size={13} />}
            Copy share link
          </button>
        }
      />

      <div className="flex gap-1 mb-5 p-1 rounded-xl bg-surface-900 border border-surface-800 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              tab === t ? 'bg-brand-600 text-white' : 'text-surface-400 hover:text-surface-100'
            }`}
          >
            {t} ({submissions.filter((s) => s.status === t).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Camera} title="Nothing here" description={`No ${tab} photo submissions.`} />
      ) : (
        <div className="grid sm:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card overflow-hidden !p-0"
            >
              <div className="aspect-square bg-surface-950/60">
                <img src={s.url} alt={s.caption || 'Submitted photo'} className="w-full h-full object-cover" />
              </div>
              <div className="p-3 space-y-2">
                {s.caption && <p className="text-sm text-surface-300 line-clamp-2">{s.caption}</p>}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-surface-500">
                  <span className="flex items-center gap-1"><User size={11} />{s.name || 'Anonymous'}</span>
                  {s.eventTitle && <span className="flex items-center gap-1"><Calendar size={11} />{s.eventTitle}</span>}
                </div>
                <p className="text-[11px] text-surface-600">{formatDateTime(s.createdAt)}</p>
                {tab === 'pending' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => approve(s)}
                      disabled={busyId === s.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
                    >
                      {busyId === s.id ? <Spinner size={13} /> : <><Check size={13} /> Approve</>}
                    </button>
                    <button
                      onClick={() => reject(s)}
                      disabled={busyId === s.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-surface-700 text-surface-300 hover:border-red-500 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      <XIcon size={13} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
