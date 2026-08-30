import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Lightbulb, CheckCircle2, Archive, Trash2, User } from 'lucide-react'
import { dbGet, dbUpdate, dbRemove, logActivity } from '@/lib/firebase'
import { formatDateTime } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, EmptyState, Spinner, Skeleton } from '@/components/ui'
import type { Suggestion } from '@/lib/community'

const TABS = ['new', 'reviewed', 'archived'] as const

export function SuggestionsManager() {
  const { user, profile } = useAuth()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<(typeof TABS)[number]>('new')
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    const data = await dbGet<Record<string, Omit<Suggestion, 'id'>>>('suggestions')
    setSuggestions(
      data
        ? Object.entries(data)
            .map(([id, v]) => ({ ...v, id }))
            .sort((a, b) => b.createdAt - a.createdAt)
        : []
    )
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  async function setStatus(s: Suggestion, status: Suggestion['status']) {
    if (!user || !profile) return
    setBusyId(s.id)
    try {
      await dbUpdate(`suggestions/${s.id}`, { status })
      await logActivity({
        userUid: user.uid, userEmail: profile.email, role: profile.role,
        action: 'UPDATE_SUGGESTION', targetResource: 'suggestions', targetId: s.id,
        previousValue: { status: s.status }, newValue: { status },
      })
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function remove(s: Suggestion) {
    if (!user || !profile) return
    if (!confirm('Delete this suggestion permanently?')) return
    setBusyId(s.id)
    try {
      await dbRemove(`suggestions/${s.id}`)
      await logActivity({
        userUid: user.uid, userEmail: profile.email, role: profile.role,
        action: 'DELETE_SUGGESTION', targetResource: 'suggestions', targetId: s.id,
      })
      toast.success('Suggestion deleted.')
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const filtered = suggestions.filter((s) => (s.status ?? 'new') === tab)

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="Suggestions"
        description={`${suggestions.filter((s) => (s.status ?? 'new') === 'new').length} new · ${suggestions.length} total`}
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
            {t} ({suggestions.filter((s) => (s.status ?? 'new') === t).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Lightbulb} title="Nothing here" description={`No ${tab} suggestions.`} />
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="badge-gray text-xs">{s.category}</span>
                  <span className="flex items-center gap-1 text-xs text-surface-500">
                    <User size={11} />{s.name || 'Anonymous'}
                  </span>
                </div>
                <span className="text-xs text-surface-600">{formatDateTime(s.createdAt)}</span>
              </div>
              <p className="text-sm text-surface-300 whitespace-pre-wrap mb-3">{s.message}</p>
              <div className="flex gap-2">
                {tab !== 'reviewed' && (
                  <button
                    onClick={() => setStatus(s, 'reviewed')}
                    disabled={busyId === s.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-surface-700 text-surface-300 hover:border-clay-500 hover:text-clay-600 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 size={12} /> Mark Reviewed
                  </button>
                )}
                {tab !== 'archived' && (
                  <button
                    onClick={() => setStatus(s, 'archived')}
                    disabled={busyId === s.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-surface-700 text-surface-300 hover:border-surface-500 transition-colors disabled:opacity-50"
                  >
                    <Archive size={12} /> Archive
                  </button>
                )}
                <button
                  onClick={() => remove(s)}
                  disabled={busyId === s.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-surface-700 text-surface-400 hover:border-red-500/50 hover:text-red-500 transition-colors disabled:opacity-50 ml-auto"
                >
                  {busyId === s.id ? <Spinner size={12} /> : <Trash2 size={12} />} Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
