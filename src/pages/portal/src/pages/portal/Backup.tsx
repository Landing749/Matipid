import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { HardDrive, Download, Upload, Plus, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { v4 as uuid } from 'uuid'
import { dbGet, dbSet, dbPush, logActivity } from '@/lib/firebase'
import { formatDateTime, downloadJSON } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, EmptyState, Modal, Spinner, StatusBadge } from '@/components/ui'

interface BackupRecord {
  id: string
  createdAt: number
  createdBy: string
  createdByEmail: string
  size: number
  collections: string[]
  label?: string
}

const COLLECTIONS = ['events', 'announcements', 'transactions', 'audit_records', 'settings', 'logs', 'officers', 'gallery']

export function Backup() {
  const { user, profile } = useAuth()
  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [restorePreview, setRestorePreview] = useState<{ data: Record<string, unknown>; filename: string } | null>(null)
  const [label, setLabel] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadBackups() {
    const data = await dbGet<Record<string, BackupRecord>>('backups')
    if (data) {
      setBackups(
        Object.entries(data)
          .map(([id, v]) => ({ ...v, id }))
          .sort((a, b) => b.createdAt - a.createdAt)
      )
    } else {
      setBackups([])
    }
  }

  useEffect(() => { loadBackups().finally(() => setLoading(false)) }, [])

  async function createBackup() {
    if (!user || !profile) return
    setCreating(true)
    try {
      // Fetch all collections
      const snapshot: Record<string, unknown> = {}
      await Promise.all(
        COLLECTIONS.map(async (col) => {
          const data = await dbGet(col)
          snapshot[col] = data ?? {}
        })
      )

      const backupData = {
        __meta: {
          createdAt: Date.now(),
          createdBy: profile.email,
          version: '1.0',
          collections: COLLECTIONS,
        },
        ...snapshot,
      }

      const sizeBytes = new Blob([JSON.stringify(backupData)]).size
      const id = uuid()
      const record: BackupRecord = {
        id,
        createdAt: Date.now(),
        createdBy: user.uid,
        createdByEmail: profile.email,
        size: sizeBytes,
        collections: COLLECTIONS,
        label: label.trim() || undefined,
      }

      await dbSet(`backups/${id}`, record)
      downloadJSON(backupData, `matipid-backup-${new Date().toISOString().split('T')[0]}.json`)

      await logActivity({
        userUid: user.uid,
        userEmail: profile.email,
        role: profile.role,
        action: 'BACKUP_CREATED',
        targetResource: 'backups',
        targetId: id,
        details: label.trim() || 'Manual backup',
      })

      toast.success('Backup created and downloaded.')
      setLabel('')
      loadBackups()
    } catch (e) {
      toast.error('Backup failed. Check console.')
      console.error(e)
    } finally {
      setCreating(false)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!data.__meta) throw new Error('Invalid backup format')
        setRestorePreview({ data, filename: file.name })
      } catch {
        toast.error('Invalid backup file. Please select a valid MATIPID backup JSON.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function doRestore() {
    if (!restorePreview || !user || !profile) return
    setRestoring(true)
    try {
      const { data } = restorePreview
      const collections = data.__meta ? (data.__meta as { collections: string[] }).collections : COLLECTIONS
      await Promise.all(
        (collections as string[]).map(async (col) => {
          if (data[col]) await dbSet(col, data[col])
        })
      )

      await logActivity({
        userUid: user.uid,
        userEmail: profile.email,
        role: profile.role,
        action: 'BACKUP_RESTORED',
        targetResource: 'backups',
        details: `Restored from ${restorePreview.filename}`,
      })

      toast.success('Backup restored successfully.')
      setRestorePreview(null)
    } catch (e) {
      toast.error('Restore failed.')
      console.error(e)
    } finally {
      setRestoring(false)
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="Backup"
        description="Create and restore full database snapshots."
      />

      {/* Actions card */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {/* Create backup */}
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600/15 flex items-center justify-center">
              <Download size={18} className="text-brand-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-100">Create Backup</p>
              <p className="text-xs text-surface-500">Export all data as JSON</p>
            </div>
          </div>
          <div>
            <label className="label">Label (optional)</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="input text-sm"
              placeholder="e.g. Before semester-end update"
            />
          </div>
          <button onClick={createBackup} disabled={creating} className="btn-primary w-full justify-center">
            {creating ? <Spinner size={16} /> : <><Plus size={16} /> Create &amp; Download</>}
          </button>
        </div>

        {/* Restore backup */}
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold-500/15 flex items-center justify-center">
              <Upload size={18} className="text-gold-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-100">Restore Backup</p>
              <p className="text-xs text-surface-500">Import a JSON backup file</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
            ⚠️ Restoring will overwrite all current data. This cannot be undone without another backup.
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-secondary w-full justify-center"
          >
            <Upload size={16} /> Select Backup File
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="sr-only"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* Backup history */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-800/60 flex items-center gap-2">
          <HardDrive size={16} className="text-surface-400" />
          <h2 className="text-sm font-semibold text-surface-200">Backup History</h2>
          <span className="ml-auto badge-gray">{backups.length}</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-surface-500 text-sm">Loading…</div>
        ) : backups.length === 0 ? (
          <EmptyState icon={HardDrive} title="No backups yet" description="Create your first backup above." />
        ) : (
          <div className="divide-y divide-surface-800/40">
            {backups.map((backup, i) => (
              <div key={backup.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-800/20 transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${i === 0 ? 'bg-emerald-500/15' : 'bg-surface-800'}`}>
                  {i === 0
                    ? <CheckCircle2 size={16} className="text-emerald-400" />
                    : <HardDrive size={16} className="text-surface-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-surface-100">
                      {backup.label ?? `Backup ${formatDateTime(backup.createdAt)}`}
                    </p>
                    {i === 0 && <span className="badge-green text-[10px]">Latest</span>}
                  </div>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {backup.createdByEmail} · {formatSize(backup.size)} · {backup.collections.length} collections
                  </p>
                </div>
                <p className="text-xs text-surface-500 flex-shrink-0 hidden sm:block">{formatDateTime(backup.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restore confirm modal */}
      <Modal
        open={!!restorePreview}
        onClose={() => setRestorePreview(null)}
        title="Confirm Restore"
        size="md"
      >
        {restorePreview && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
              <p className="font-semibold mb-1">⚠️ Destructive Operation</p>
              <p>This will overwrite ALL current data with the contents of this backup. Create a new backup first if you want to preserve the current state.</p>
            </div>

            <div className="p-4 rounded-xl bg-surface-800/60 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-500">File</span>
                <span className="text-surface-200 font-mono text-xs">{restorePreview.filename}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Backup date</span>
                <span className="text-surface-200">
                  {restorePreview.data.__meta
                    ? formatDateTime((restorePreview.data.__meta as { createdAt: number }).createdAt)
                    : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-500">Collections</span>
                <span className="text-surface-200">
                  {restorePreview.data.__meta
                    ? (restorePreview.data.__meta as { collections: string[] }).collections.join(', ')
                    : 'All'}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setRestorePreview(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={doRestore} disabled={restoring} className="btn-danger flex-1 border-red-600/40 bg-red-600/15 text-red-300 hover:bg-red-600/25">
                {restoring ? <Spinner size={16} /> : <><AlertCircle size={14} /> Restore Anyway</>}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  )
}
