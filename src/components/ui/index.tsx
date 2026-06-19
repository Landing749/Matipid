import { cn } from '@/lib/utils'
import { Loader2, TrendingUp, TrendingDown, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Skeleton ────────────────────────────────────────────────────────────────

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

const colorConfig: Record<
  string,
  { icon: string; bar: string; glow: string; trend: string }
> = {
  brand: {
    icon: 'bg-brand-600/15 text-brand-400',
    bar: 'from-brand-400 via-brand-500 to-brand-700',
    glow: 'rgba(124,26,255,0.12)',
    trend: 'text-brand-400',
  },
  gold: {
    icon: 'bg-gold-500/15 text-gold-400',
    bar: 'from-gold-300 via-gold-400 to-gold-600',
    glow: 'rgba(245,158,11,0.12)',
    trend: 'text-gold-400',
  },
  green: {
    icon: 'bg-emerald-500/15 text-emerald-400',
    bar: 'from-emerald-300 via-emerald-400 to-emerald-600',
    glow: 'rgba(16,185,129,0.10)',
    trend: 'text-emerald-400',
  },
  red: {
    icon: 'bg-red-500/15 text-red-400',
    bar: 'from-red-400 via-red-500 to-red-700',
    glow: 'rgba(239,68,68,0.10)',
    trend: 'text-red-400',
  },
  gray: {
    icon: 'bg-surface-700/30 text-surface-400',
    bar: 'from-surface-600 via-surface-500 to-surface-700',
    glow: 'rgba(113,113,122,0.08)',
    trend: 'text-surface-400',
  },
}

export function StatCard({ label, value, icon: Icon, trend, color = 'brand', loading }: StatCardProps) {
  const cfg = colorConfig[color]

  if (loading) {
    return (
      <div className="card overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-surface-800 animate-pulse" />
        <Skeleton className="h-9 w-9 rounded-xl mb-4" />
        <Skeleton className="h-7 w-28 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: `0 12px 32px -4px ${cfg.glow}` }}
      transition={{ duration: 0.28 }}
      className="card-hover group relative overflow-hidden"
    >
      {/* Gradient top accent */}
      <div className={cn('absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r', cfg.bar)} />

      {/* Subtle bg wash on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(ellipse 80% 60% at 20% 0%, ${cfg.glow} 0%, transparent 70%)` }}
      />

      <div className="relative flex items-start justify-between mb-4">
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          className={cn('w-9 h-9 rounded-xl flex items-center justify-center', cfg.icon)}
        >
          <Icon size={17} />
        </motion.div>

        {trend && (
          <span className={cn(
            'inline-flex items-center gap-0.5 text-[11px] font-semibold rounded-full px-2 py-0.5',
            trend.value >= 0
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-red-400 bg-red-500/10'
          )}>
            {trend.value >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>

      <p className="relative text-[22px] font-bold text-surface-100 font-display tracking-tight tabular-nums leading-none mb-1.5">
        {value}
      </p>
      <p className="relative text-[10px] text-surface-500 font-semibold uppercase tracking-[0.1em]">{label}</p>

      {trend?.label && (
        <p className="relative text-[10px] text-surface-600 mt-1.5">{trend.label}</p>
      )}
    </motion.div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  illustration: Illustration,
  title,
  description,
  action,
}: {
  /** @deprecated prefer `illustration` */
  icon?: React.ElementType
  illustration?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col items-center justify-center py-16 gap-4 text-center"
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-2/3 w-72 h-48 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(ellipse, rgba(124,26,255,0.07) 0%, transparent 70%)' }}
      />

      {Illustration ? (
        <Illustration className="relative z-10 w-52 h-44 sm:w-60 sm:h-48" />
      ) : Icon ? (
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: 'rgba(124,26,255,0.08)',
            border: '1px solid rgba(124,26,255,0.2)',
            boxShadow: '0 8px 24px -4px rgba(124,26,255,0.15)',
          }}
        >
          <Icon size={26} className="relative text-brand-400" />
        </motion.div>
      ) : null}

      {/* Decorative dot separator */}
      <div className="relative z-10 flex items-center gap-1.5">
        <div className="h-px w-10 bg-gradient-to-r from-transparent to-surface-800" />
        <span className="w-1.5 h-1.5 rounded-full bg-brand-500/40" />
        <span className="w-1 h-1 rounded-full bg-surface-700" />
        <span className="w-1.5 h-1.5 rounded-full bg-gold-500/40" />
        <div className="h-px w-10 bg-gradient-to-l from-transparent to-surface-800" />
      </div>

      <div className="relative z-10 max-w-[260px] space-y-1.5">
        <p className="text-[14px] font-semibold text-surface-100 font-display tracking-tight leading-snug">{title}</p>
        {description && (
          <p className="text-[13px] text-surface-500 leading-relaxed">{description}</p>
        )}
      </div>

      {action && <div className="relative z-10 mt-1">{action}</div>}
    </motion.div>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────────────

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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-surface-950/75 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className={cn(
              'relative w-full bg-surface-900 border border-surface-700/50 rounded-2xl shadow-2xl overflow-hidden',
              sizeMap[size]
            )}
            style={{ boxShadow: '0 24px 64px -8px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,26,255,0.08) inset' }}
          >
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-[1px]"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(124,26,255,0.4), transparent)' }} />

            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800/60">
              <h2 className="text-[14px] font-semibold text-surface-100 font-display">{title}</h2>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-5">{children}</div>
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

// ─── Status Badge ─────────────────────────────────────────────────────────────

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
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="flex items-start justify-between mb-6"
    >
      <div className="flex items-start gap-3">
        {/* Left accent bar */}
        <div
          className="w-[3px] h-8 rounded-full flex-shrink-0 mt-0.5"
          style={{ background: 'linear-gradient(180deg, #bf99ff 0%, #7c1aff 100%)' }}
        />
        <div>
          <h1 className="text-[22px] font-bold text-surface-100 font-display tracking-tight leading-tight">{title}</h1>
          {description && (
            <p className="text-[13px] text-surface-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </motion.div>
  )
}
