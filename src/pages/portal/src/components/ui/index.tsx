import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

// ─── Skeleton ───────────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton animate-pulse', className)} />
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  trend?: { value: number; label: string }
  color?: 'brand' | 'gold' | 'green' | 'red' | 'gray'
  loading?: boolean
}

const colorMap = {
  brand: 'bg-brand-600/15 text-brand-400',
  gold: 'bg-gold-500/15 text-gold-400',
  green: 'bg-emerald-500/15 text-emerald-400',
  red: 'bg-red-500/15 text-red-400',
  gray: 'bg-surface-700/30 text-surface-400',
}

export function StatCard({ label, value, icon: Icon, trend, color = 'brand', loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="card">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.3 }}
      className="card-hover group"
    >
      <div className="flex items-start justify-between mb-3">
        <motion.div
          whileHover={{ scale: 1.12, rotate: 6 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className={cn('w-9 h-9 rounded-xl flex items-center justify-center', colorMap[color])}
        >
          <Icon size={18} />
        </motion.div>
      </div>
      <p className="text-2xl font-bold text-surface-100 mb-1 tabular-nums">{value}</p>
      <p className="text-xs text-surface-500 font-medium uppercase tracking-wider">{label}</p>
      {trend && (
        <p className={cn('text-xs mt-2', trend.value >= 0 ? 'text-emerald-400' : 'text-red-400')}>
          {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
        </p>
      )}
    </motion.div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 gap-4"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="w-14 h-14 rounded-2xl bg-surface-800/60 flex items-center justify-center"
      >
        <Icon size={24} className="text-surface-500" />
      </motion.div>
      <div className="text-center">
        <p className="text-surface-200 font-medium">{title}</p>
        {description && <p className="text-surface-500 text-sm mt-1">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────────────

import { X } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-surface-950/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className={cn('relative w-full bg-surface-900 border border-surface-700/60 rounded-2xl shadow-2xl overflow-hidden', sizeMap[size])}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800/60">
              <h2 className="text-base font-semibold text-surface-100">{title}</h2>
              <button onClick={onClose} className="text-surface-500 hover:text-surface-300 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="text-brand-400 animate-spin" />
}

// ─── Badge Status ─────────────────────────────────────────────────────────────

const statusBadge: Record<string, string> = {
  pending: 'badge-yellow',
  approved: 'badge-green',
  flagged: 'badge-red',
  rejected: 'badge-red',
  archived: 'badge-gray',
  healthy: 'badge-green',
  delayed: 'badge-yellow',
  offline: 'badge-red',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('badge', statusBadge[status] ?? 'badge-gray')}>
      <span className={cn('w-1.5 h-1.5 rounded-full', {
        'bg-yellow-400': status === 'pending',
        'bg-emerald-400': status === 'approved' || status === 'healthy',
        'bg-red-400': status === 'flagged' || status === 'rejected' || status === 'offline',
        'bg-surface-400': status === 'archived',
      })} />
      {status}
    </span>
  )
}

// ─── Page Header ─────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-start justify-between mb-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-surface-100">{title}</h1>
        {description && <p className="text-surface-500 text-sm mt-1">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </motion.div>
  )
}
