import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
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
}

export function PortalHeader() {
  const location = useLocation()
  const { theme, toggle } = useTheme()
  const { role } = useAuth()

  const label = ROUTE_LABELS[location.pathname] ?? 'Portal'

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-surface-800/60 bg-surface-950/80 backdrop-blur-md flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-surface-500 text-sm">Portal</span>
        <span className="text-surface-700">/</span>
        <motion.span
          key={label}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="text-surface-100 text-sm font-medium"
        >
          {label}
        </motion.span>
      </div>

      <div className="flex items-center gap-2">
        {role && (
          <span className="badge-purple mr-2 capitalize hidden sm:inline-flex">
            {ROLE_LABELS[role]}
          </span>
        )}

        <motion.button
          onClick={toggle}
          whileHover={{ scale: 1.08, rotate: 12 }}
          whileTap={{ scale: 0.92 }}
          className="p-2 rounded-xl text-surface-400 hover:bg-surface-800 hover:text-surface-100 transition-colors"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </motion.button>

        <NotificationsPanel />
      </div>
    </header>
  )
}
