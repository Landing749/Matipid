import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { History, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { dbGet, dbSet, logActivity } from '@/lib/firebase'
import { formatDateTime } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, EmptyState, Modal, Spinner } from '@/components/ui'

type ResourceType = 'transactions' | 'events' | 'announcements' | 'settings'

interface VersionEntry {
  id: string
  data: unknown
  savedAt: number
  savedBy: string
  savedByEmail: string
}

interface VersionGroup {
  resourceId: string
  versions: VersionEntry[]
}

const RESOURCES: { key: ResourceType; label: string }[] = [
  { key: 'transactions', label: 'Transactions' },
  { key: 'events', label: 'Events' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'settings', label: 'Settings' },
]

export function VersionHistory() {
  const { user, profile } = useAuth()
  const [resource, setResource] = useState<ResourceType>('transactions')
  const [groups, setGroups] = useState<VersionGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [rollbackTarget, setRollbackTarget] = useState<{ resourceId: string; version: VersionEntry } | null>(null)
  const [rollingBack, setRollingBack] = useState(false)
  const [preview, setPreview] = useState<unknown>(null)

  const loadVersions = useCallback(async () => {
    setLoading(true)
    try {
      const data = await dbGet<Record<string, Record<string, VersionEntry>>>(`versions/${resource}`)
      if (data) {
        const result: VersionGroup[] = Object.entries(data).map(([resourceId, versions]) => ({
          resourceId,
          versions: Object.entries(versions)
            .map(([id, v]) => ({ ...v, id }))
            .sort((a, b) => b.savedAt - a.savedAt),
        }))
        setGroups(result)
      } else {
        setGroups([])
      }
    } finally {
      setLoading(false)
    }
  }, [resource])

  // Standard "start loading, fetch, stop loading" pattern — the compiler's
  // set-state-in-effect rule flags the synchronous setLoading(true) inside
  // loadVersions, but it's not part of a dependency that re-triggers this
  // effect, so it can't cascade.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadVersions() }, [loadVersions])

  async function doRollback() {
    if (!rollbackTarget || !user || !profile) return
    setRollingBack(true)

    try {
      const { resourceId, version } = rollbackTarget
      const path = `${resource}/${resourceId}`

      // Get current value for audit trail
      const current = await dbGet<unknown>(path)

      // Restore the version
      await dbSet(path, { ...(version.data as Record<string, unknown>), updatedAt: Date.now(), version: Date.now() })

      // Log the rollback
      await logActivity({
        userUid: user.uid,
        userEmail: profile.email,
        role: profile.role,
        action: 'ROLLBACK',
        targetResource: resource,
        targetId: resourceId,
        previousValue: current,
        newValue: version.data,
        details: `Rolled back to version from ${formatDateTime(version.savedAt)}`,
      })

      toast.success('Rollback successful. Previous version restored.')
      setRollbackTarget(null)
      loadVersions()
    } catch {
      toast.error('Rollback failed. Try again.')
    } finally {
      setRollingBack(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="Version History"
        description="Browse and restore previous versions of any record."
      />

      {/* Resource selector */}
      <div className="flex gap-1 mb-6 bg-[rgba(var(--surface-overlay-rgb),0.5)] rounded-xl p-1 w-fit border border-[rgba(var(--surface-overlay-rgb),0.7)] shadow-clay-sm">
        {RESOURCES.map((r) => (
          <button
            key={r.key}
            onClick={() => setResource(r.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              resource === r.key ? 'bg-brand-100 text-brand-700' : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-surface-500">Loading versions…</div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={History}
          title="No version history"
          description={`No versions recorded for ${resource} yet.`}
        />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.resourceId} className="card p-0 overflow-hidden">
              {/* Group header */}
              <button
                onClick={() => setExpanded(expanded === group.resourceId ? null : group.resourceId)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-800/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expanded === group.resourceId
                    ? <ChevronDown size={16} className="text-surface-400" />
                    : <ChevronRight size={16} className="text-surface-400" />
                  }
                  <div className="text-left">
                    <p className="text-sm font-medium text-surface-100 font-mono">{group.resourceId.slice(0, 20)}…</p>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {group.versions.length} version{group.versions.length !== 1 ? 's' : ''} · Last modified {formatDateTime(group.versions[0].savedAt)}
                    </p>
                  </div>
                </div>
                <span className="badge-gray">{group.versions.length}v</span>
              </button>

              {/* Versions list */}
              {expanded === group.resourceId && (
                <div className="border-t border-surface-800/60 divide-y divide-surface-800/40">
                  {group.versions.map((ver, i) => (
                    <div key={ver.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-800/20">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-brand-600">v{group.versions.length - i}</span>
                          {i === 0 && <span className="badge-green text-xs">Current</span>}
                          <span className="text-xs text-surface-400">{formatDateTime(ver.savedAt)}</span>
                        </div>
                        <p className="text-xs text-surface-500 mt-0.5">by {ver.savedByEmail}</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setPreview(ver.data)}
                          className="btn-ghost text-xs py-1.5 px-3"
                        >
                          Preview
                        </button>
                        {i !== 0 && (
                          <button
                            onClick={() => setRollbackTarget({ resourceId: group.resourceId, version: ver })}
                            className="btn-secondary text-xs py-1.5 px-3 gap-1"
                          >
                            <RotateCcw size={12} /> Restore
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title="Version Preview" size="xl">
        <pre className="bg-surface-950 rounded-xl p-4 overflow-x-auto text-xs text-surface-300 max-h-96 font-mono">
          {JSON.stringify(preview, null, 2)}
        </pre>
        <button onClick={() => setPreview(null)} className="btn-secondary w-full mt-4">Close</button>
      </Modal>

      {/* Rollback confirm modal */}
      <Modal
        open={!!rollbackTarget}
        onClose={() => setRollbackTarget(null)}
        title="Confirm Rollback"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-sm text-orange-300">
            <p className="font-semibold mb-1">⚠️ This will overwrite the current version.</p>
            <p>The current state will still be preserved in version history. This action will be logged.</p>
          </div>
          {rollbackTarget && (
            <p className="text-sm text-surface-400">
              Restore to version from{' '}
              <span className="text-surface-200 font-medium">{formatDateTime(rollbackTarget.version.savedAt)}</span>
              {' '}by {rollbackTarget.version.savedByEmail}?
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={() => setRollbackTarget(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={doRollback} disabled={rollingBack} className="btn-gold flex-1">
              {rollingBack ? <Spinner size={16} /> : <><RotateCcw size={14} /> Restore</>}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}
