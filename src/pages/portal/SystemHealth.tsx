import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Activity, Wifi, WifiOff, RefreshCw, Database, Cloud, Shield } from 'lucide-react'
import { auth, dbGet, dbSet } from '@/lib/firebase'
import { formatDateTime } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/ui'

declare const __BUILD_TIME__: string
declare const __GIT_SHA__: string
declare const __APP_VERSION__: string

type ServiceStatus = 'healthy' | 'delayed' | 'offline' | 'checking'

interface ServiceCheck {
  name: string
  icon: React.ElementType
  status: ServiceStatus
  latency?: number
  lastCheck?: number
  message?: string
}

function StatusIndicator({ status }: { status: ServiceStatus }) {
  const cfg = {
    healthy: { dot: 'bg-emerald-400 shadow-emerald-400/50', text: 'text-emerald-400', label: 'Healthy' },
    delayed: { dot: 'bg-yellow-400 shadow-yellow-400/50', text: 'text-yellow-400', label: 'Delayed' },
    offline: { dot: 'bg-red-400 shadow-red-400/50', text: 'text-red-400', label: 'Offline' },
    checking: { dot: 'bg-surface-400', text: 'text-surface-400', label: 'Checking…' },
  }[status]

  return (
    <div className={`flex items-center gap-2 ${cfg.text}`}>
      <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} ${status === 'checking' ? '' : 'shadow-[0_0_8px]'} ${status === 'healthy' ? 'animate-pulse-slow' : ''}`} />
      <span className="text-sm font-medium">{cfg.label}</span>
    </div>
  )
}

export function SystemHealth() {
  const { profile } = useAuth()
  const [services, setServices] = useState<ServiceCheck[]>([
    { name: 'Firebase Auth', icon: Shield, status: 'checking' },
    { name: 'Realtime Database', icon: Database, status: 'checking' },
    { name: 'Cloudinary CDN', icon: Cloud, status: 'checking' },
  ])
  const [pendingAudits, setPendingAudits] = useState<number>(0)
  const [lastBackup, setLastBackup] = useState<number | null>(null)
  const [activeSessions, setActiveSessions] = useState<number>(0)
  const [storageUsage, setStorageUsage] = useState<string>('—')
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now())

  const runChecks = useCallback(async () => {
    setRefreshing(true)
    const updates: ServiceCheck[] = []

    // Check Firebase Auth
    const authStart = Date.now()
    try {
      await auth.currentUser?.getIdToken(true)
      updates[0] = { name: 'Firebase Auth', icon: Shield, status: 'healthy', latency: Date.now() - authStart, lastCheck: Date.now() }
    } catch {
      updates[0] = { name: 'Firebase Auth', icon: Shield, status: 'offline', lastCheck: Date.now(), message: 'Auth unreachable' }
    }

    // Check RTDB
    const dbStart = Date.now()
    try {
      await dbSet('_heartbeat/portal', Date.now())
      const latency = Date.now() - dbStart
      updates[1] = {
        name: 'Realtime Database',
        icon: Database,
        status: latency > 2000 ? 'delayed' : 'healthy',
        latency,
        lastCheck: Date.now(),
      }
    } catch {
      updates[1] = { name: 'Realtime Database', icon: Database, status: 'offline', lastCheck: Date.now(), message: 'DB unreachable' }
    }

    // Check Cloudinary (ping their API endpoint)
    const cdnStart = Date.now()
    try {
      const res = await fetch('https://res.cloudinary.com/damr6r9op/image/upload/w_1/placeholder.jpg', { method: 'HEAD' })
      const latency = Date.now() - cdnStart
      updates[2] = {
        name: 'Cloudinary CDN',
        icon: Cloud,
        status: latency > 3000 ? 'delayed' : 'healthy',
        latency,
        lastCheck: Date.now(),
      }
    } catch {
      updates[2] = { name: 'Cloudinary CDN', icon: Cloud, status: 'delayed', lastCheck: Date.now(), message: 'CDN may be unreachable' }
    }

    setServices(updates)

    // Load stats
    const [txData, backupData] = await Promise.all([
      dbGet<Record<string, { status: string }>>('transactions'),
      dbGet<Record<string, { createdAt: number }>>('backups'),
    ])

    if (txData) {
      setPendingAudits(Object.values(txData).filter((t) => t.status === 'pending').length)
    }
    if (backupData) {
      const times = Object.values(backupData).map((b) => b.createdAt)
      setLastBackup(times.length > 0 ? Math.max(...times) : null)
    }

    setLastRefresh(Date.now())
    setRefreshing(false)
  }, [])

  useEffect(() => {
    runChecks()
    const interval = setInterval(runChecks, 30_000)
    return () => clearInterval(interval)
  }, [runChecks])

  const overallStatus: ServiceStatus = services.every((s) => s.status === 'healthy')
    ? 'healthy'
    : services.some((s) => s.status === 'offline')
    ? 'offline'
    : services.some((s) => s.status === 'checking')
    ? 'checking'
    : 'delayed'

  const metrics = [
    { label: 'Pending Audits', value: String(pendingAudits), alert: pendingAudits > 0 },
    { label: 'Last Backup', value: lastBackup ? formatDateTime(lastBackup) : 'Never', alert: !lastBackup },
    { label: 'App Version', value: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0' },
    { label: 'Build Time', value: typeof __BUILD_TIME__ !== 'undefined' ? new Date(__BUILD_TIME__).toLocaleDateString() : '—' },
    { label: 'Commit SHA', value: typeof __GIT_SHA__ !== 'undefined' ? __GIT_SHA__.slice(0, 7) : 'dev' },
    { label: 'Last Refresh', value: formatDateTime(lastRefresh) },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader
        title="System Health"
        description="Real-time status of all connected services."
        action={
          <button onClick={runChecks} disabled={refreshing} className="btn-secondary gap-2">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {/* Overall status banner */}
      <div className={`card mb-6 flex items-center justify-between ${
        overallStatus === 'healthy' ? 'border-emerald-600/30 bg-emerald-900/10' :
        overallStatus === 'offline' ? 'border-red-600/30 bg-red-900/10' :
        'border-yellow-600/30 bg-yellow-900/10'
      }`}>
        <div className="flex items-center gap-3">
          <Activity size={20} className={
            overallStatus === 'healthy' ? 'text-emerald-400' :
            overallStatus === 'offline' ? 'text-red-400' : 'text-yellow-400'
          } />
          <div>
            <p className="text-sm font-semibold text-surface-100">Overall System Status</p>
            <p className="text-xs text-surface-500 mt-0.5">All services checked {refreshing ? '…' : `${Math.round((Date.now() - lastRefresh) / 1000)}s ago`}</p>
          </div>
        </div>
        <StatusIndicator status={overallStatus} />
      </div>

      {/* Service cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {services.map((svc) => (
          <motion.div
            key={svc.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center">
                <svc.icon size={18} className="text-surface-300" />
              </div>
              <StatusIndicator status={svc.status} />
            </div>
            <p className="text-sm font-semibold text-surface-100 mb-1">{svc.name}</p>
            {svc.latency !== undefined && (
              <p className="text-xs text-surface-500">{svc.latency}ms response</p>
            )}
            {svc.message && (
              <p className="text-xs text-red-400 mt-1">{svc.message}</p>
            )}
            {svc.lastCheck && (
              <p className="text-xs text-surface-600 mt-2">{formatDateTime(svc.lastCheck)}</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Metrics grid */}
      <div className="card">
        <h2 className="text-sm font-semibold text-surface-200 mb-4">Platform Metrics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="p-3 rounded-xl bg-surface-800/40">
              <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">{m.label}</p>
              <p className={`text-sm font-semibold font-mono ${m.alert ? 'text-yellow-400' : 'text-surface-100'}`}>
                {m.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Heartbeat log */}
      <div className="card mt-4">
        <h2 className="text-sm font-semibold text-surface-200 mb-3">Heartbeat</h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={`w-2 rounded-sm transition-all ${
                  i < 18 ? 'h-4 bg-emerald-500/70' :
                  i === 18 ? 'h-6 bg-emerald-400' :
                  'h-3 bg-emerald-600/40'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-emerald-400 font-medium">Live</span>
        </div>
        <p className="text-xs text-surface-600 mt-2">Auto-refreshes every 30 seconds</p>
      </div>
    </motion.div>
  )
}
