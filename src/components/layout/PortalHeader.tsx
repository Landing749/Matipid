import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sun, Moon, ChevronRight } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_LABELS } from '@/lib/utils'
import { NotificationsPanel } from '@/components/NotificationsPanel'

const ROUTE_LABELS: Record<string, string> = {
  '/portal/dashboard': 'Dashboard',
  '/portal/finance': 'Finance',
  '/portal/audit': 'Audit',
  '/portal/logs': 'Activity Log',
  '/portal/versions': 'Version History',
  '/portal/backup': 'Backup',
  '/portal/health': 'System Health',
  '/portal/analytics': 'Analytics',
  '/portal/storage': 'Storage',
  '/portal/users': 'User Management',
  '/portal/settings': 'Settings',
  '/portal/search': 'Search',
  '/portal/budget': 'Budget Tracker',
  '/portal/calendar': 'Calendar',
  '/portal/members': 'Members Directory',
  '/portal/announcements': 'Announcements',
  '/portal/events': 'Events',
  '/portal/timeline': 'Timeline',
  '/portal/gallery': 'Gallery',
  '/portal/officers': 'Officers',
}

function LiveClock() {
  const now = new Date()
  const day = now.toLocaleDateString('en-PH', { weekday: 'short' })
  const date = now.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  return (
    <span className="text-[11px] text-surface-500 tabular-nums hidden md:block">
      {day}, {date}
    </span>
  )
}

export function PortalHeader() {
  const location = useLocation()
  const { theme, toggle } = useTheme()
  const { role } = useAuth()

  const label = ROUTE_LABELS[location.pathname] ?? 'Portal'

  return (
    <header className="relative h-[52px] flex items-center justify-between px-5 border-b border-surface-800/60 flex-shrink-0 bg-surface-950/90 backdrop-blur-md">
      {/* Subtle brand accent line at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(116,88,189,0.3) 30%, rgba(116,88,189,0.3) 70%, transparent 100%)' }}
      />

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-surface-600 uppercase tracking-wider">Portal</span>
        <ChevronRight size={11} className="text-surface-700" />
        <motion.span
          key={label}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18 }}
          className="text-[13px] font-semibold text-surface-100 font-display"
        >
          {label}
        </motion.span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1">
        <LiveClock />

        {/* Divider */}
        <div className="w-px h-4 bg-surface-800 mx-1.5 hidden md:block" />

        {role && (
          <span className="badge-purple capitalize hidden sm:inline-flex text-[10px] mr-1">
            {ROLE_LABELS[role]}
          </span>
        )}

        <motion.button
          onClick={toggle}
          whileHover={{ scale: 1.1, rotate: 15 }}
          whileTap={{ scale: 0.9 }}
          className="w-8 h-8 rounded-xl text-surface-500 hover:bg-surface-800/80 hover:text-surface-200 transition-all flex items-center justify-center"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </motion.button>

        <NotificationsPanel />
      </div>
    </header>
  )
}
