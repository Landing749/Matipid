import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ScrollText, Search, Filter } from 'lucide-react'
import { ref, query, orderByChild, limitToLast, onValue, db } from '@/lib/firebase'
import { formatDateTime, ROLE_LABELS } from '@/lib/utils'
import { PageHeader, EmptyState } from '@/components/ui'

interface LogEntry {
  id: string
  timestamp: number
  userUid: string
  userEmail: string
  role: string
  action: string
  targetResource: string
  targetId?: string
  previousValue?: unknown
  newValue?: unknown
  details?: string
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'text-brand-600 bg-brand-600/10',
  LOGOUT: 'text-surface-400 bg-surface-800/50',
  CREATE: 'text-emerald-600 bg-emerald-600/10',
  UPDATE: 'text-gold-700 bg-gold-500/10',
  DELETE: 'text-red-600 bg-red-600/10',
  APPROVE: 'text-emerald-600 bg-emerald-600/10',
  REJECT: 'text-red-600 bg-red-600/10',
  FLAG: 'text-yellow-600 bg-yellow-600/10',
  BACKUP: 'text-brand-600 bg-brand-600/10',
  ROLLBACK: 'text-orange-400 bg-orange-600/10',
  RESTORE: 'text-brand-600 bg-brand-600/10',
}

function getActionColor(action: string) {
  const key = Object.keys(ACTION_COLORS).find((k) => action.startsWith(k))
  return key ? ACTION_COLORS[key] : 'text-surface-300 bg-surface-800/50'
}

const PAGE_SIZE = 50

export function ActivityLog() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [query_str, setQueryStr] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterAction, setFilterAction] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    const logsRef = query(ref(db, 'logs'), orderByChild('timestamp'), limitToLast(500))
    const unsub = onValue(logsRef, (snap) => {
      if (snap.exists()) {
        const list: LogEntry[] = []
        snap.forEach((child) => {
          list.push({ id: child.key!, ...child.val() })
        })
        list.sort((a, b) => b.timestamp - a.timestamp)
        setLogs(list)
      } else {
        setLogs([])
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const roles = ['all', ...Array.from(new Set(logs.map((l) => l.role)))]
  const actions = ['all', ...Array.from(new Set(logs.map((l) => l.action.split('_')[0])))]

  const filtered = logs.filter((l) => {
    if (filterRole !== 'all' && l.role !== filterRole) return false
    if (filterAction !== 'all' && !l.action.startsWith(filterAction)) return false
    if (query_str) {
      const q = query_str.toLowerCase()
      return l.userEmail.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.targetResource.toLowerCase().includes(q) ||
        (l.details ?? '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="Activity Log"
        description="Immutable record of all officer actions."
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input
            value={query_str}
            onChange={(e) => setQueryStr(e.target.value)}
            placeholder="Search logs…"
            className="input pl-9 text-xs h-9"
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="input text-xs h-9 w-auto flex-shrink-0"
        >
          {roles.map((r) => (
            <option key={r} value={r}>{r === 'all' ? 'All Roles' : ROLE_LABELS[r] ?? r}</option>
          ))}
        </select>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="input text-xs h-9 w-auto flex-shrink-0"
        >
          {actions.map((a) => (
            <option key={a} value={a}>{a === 'all' ? 'All Actions' : a}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-800/50 border border-surface-700/60 text-xs text-surface-400">
          <Filter size={12} />
          {filtered.length} entries
        </div>
      </div>

      {/* Log table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-surface-500 text-sm">Loading logs…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ScrollText} title="No logs found" description="Try adjusting your filters." />
        ) : (
          <div className="divide-y divide-surface-800/40 font-mono text-xs">
            {/* Header */}
            <div className="grid grid-cols-[160px_1fr_80px_100px_80px] gap-4 px-5 py-2.5 text-surface-600 uppercase tracking-widest text-[10px]">
              <span>Timestamp</span>
              <span>Action</span>
              <span>Resource</span>
              <span>User</span>
              <span>Role</span>
            </div>

            {filtered.slice(0, PAGE_SIZE).map((log) => (
              <div key={log.id}>
                <button
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  className="w-full grid grid-cols-[160px_1fr_80px_100px_80px] gap-4 px-5 py-2.5 hover:bg-surface-800/30 transition-colors text-left"
                >
                  <span className="text-surface-500 tabular-nums">{formatDateTime(log.timestamp)}</span>
                  <span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </span>
                  <span className="text-surface-400 truncate">{log.targetResource}</span>
                  <span className="text-surface-400 truncate">{log.userEmail.split('@')[0]}</span>
                  <span className="text-surface-500 capitalize">{log.role}</span>
                </button>

                {/* Expanded details */}
                {expanded === log.id && (
                  <div className="px-5 py-3 bg-surface-900/50 border-t border-surface-800/40 text-[11px] space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-surface-600 mb-0.5">User UID</p>
                        <p className="text-surface-300 break-all">{log.userUid}</p>
                      </div>
                      <div>
                        <p className="text-surface-600 mb-0.5">Target ID</p>
                        <p className="text-surface-300">{log.targetId ?? '—'}</p>
                      </div>
                      {log.details && (
                        <div className="col-span-2">
                          <p className="text-surface-600 mb-0.5">Details</p>
                          <p className="text-surface-300">{log.details}</p>
                        </div>
                      )}
                      {log.previousValue !== undefined && (
                        <div>
                          <p className="text-surface-600 mb-0.5">Previous</p>
                          <pre className="text-surface-400 bg-surface-800/60 rounded-lg p-2 overflow-x-auto text-[10px]">
                            {JSON.stringify(log.previousValue, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.newValue !== undefined && (
                        <div>
                          <p className="text-surface-600 mb-0.5">New Value</p>
                          <pre className="text-surface-400 bg-surface-800/60 rounded-lg p-2 overflow-x-auto text-[10px]">
                            {JSON.stringify(log.newValue, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filtered.length > PAGE_SIZE && (
              <div className="px-5 py-3 text-center text-surface-500">
                Showing first {PAGE_SIZE} of {filtered.length} entries
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
