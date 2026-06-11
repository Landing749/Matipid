import { useLocation } from 'react-router-dom'
import { Bell, Sun, Moon, Search } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_LABELS } from '@/lib/utils'

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
        <span className="text-surface-100 text-sm font-medium">{label}</span>
      </div>

      <div className="flex items-center gap-2">
        {role && (
          <span className="badge-purple mr-2 capitalize hidden sm:inline-flex">
            {ROLE_LABELS[role]}
          </span>
        )}

        <button
          onClick={toggle}
          className="p-2 rounded-xl text-surface-400 hover:bg-surface-800 hover:text-surface-100 transition-all"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button className="p-2 rounded-xl text-surface-400 hover:bg-surface-800 hover:text-surface-100 transition-all relative">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-500" />
        </button>
      </div>
    </header>
  )
}
