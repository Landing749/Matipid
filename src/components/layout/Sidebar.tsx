import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, DollarSign, ShieldCheck, ScrollText, History,
  HardDrive, Activity, BarChart2, Settings, Users, Database,
  Search, ChevronLeft, ChevronRight, LogOut, ExternalLink,
  Zap, Menu
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface NavItem {
  icon: React.ElementType
  label: string
  to: string
  roles?: string[]
  badge?: string
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/portal/dashboard' },
  { icon: DollarSign, label: 'Finance', to: '/portal/finance', roles: ['admin', 'treasurer', 'auditor'] },
  { icon: ShieldCheck, label: 'Audit', to: '/portal/audit', roles: ['admin', 'auditor'] },
  { icon: ScrollText, label: 'Activity Log', to: '/portal/logs' },
  { icon: History, label: 'Version History', to: '/portal/versions', roles: ['admin'] },
  { icon: HardDrive, label: 'Backup', to: '/portal/backup', roles: ['admin'] },
  { icon: Activity, label: 'System Health', to: '/portal/health', roles: ['admin'] },
  { icon: BarChart2, label: 'Analytics', to: '/portal/analytics' },
  { icon: Database, label: 'Storage', to: '/portal/storage', roles: ['admin'] },
  { icon: Users, label: 'Users', to: '/portal/users', roles: ['admin'] },
  { icon: Settings, label: 'Settings', to: '/portal/settings', roles: ['admin'] },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { profile, role, signOut } = useAuth()
  const navigate = useNavigate()

  const visibleItems = navItems.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  )

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="relative flex flex-col h-screen bg-surface-900/80 backdrop-blur-xl border-r border-surface-800/60 overflow-hidden flex-shrink-0 z-30"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-surface-800/60 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-600/30">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <span className="text-sm font-bold text-surface-100 whitespace-nowrap">MATIPID</span>
              <p className="text-xs text-surface-500 whitespace-nowrap">Officer Portal</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <NavLink
            to="/portal/search"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-surface-800/50 text-surface-400 text-sm hover:bg-surface-800 hover:text-surface-200 transition-all group"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="text-xs bg-surface-700 px-1.5 py-0.5 rounded text-surface-500 font-mono">⌘K</kbd>
          </NavLink>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 no-scrollbar">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                isActive
                  ? 'bg-brand-600/15 text-brand-300'
                  : 'text-surface-400 hover:bg-surface-800/60 hover:text-surface-100'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('w-4.5 h-4.5 flex-shrink-0', isActive ? 'text-brand-400' : 'text-surface-500 group-hover:text-surface-300')} size={18} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-surface-800/60 p-3 space-y-1 flex-shrink-0">
        <NavLink
          to="/"
          title={collapsed ? 'Public Site' : undefined}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-surface-500 hover:bg-surface-800/60 hover:text-surface-300 transition-all"
        >
          <ExternalLink size={16} className="flex-shrink-0" />
          {!collapsed && <span>Public Site</span>}
        </NavLink>

        {/* Profile */}
        <div className={cn('flex items-center gap-3 px-3 py-2 rounded-xl', collapsed && 'justify-center')}>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white uppercase">
            {profile?.email?.[0] ?? 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-surface-200 truncate">{profile?.email}</p>
              <p className="text-xs text-surface-500 capitalize">{role}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleSignOut} className="text-surface-600 hover:text-red-400 transition-colors p-1">
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="absolute top-4 -right-3 z-50 w-6 h-6 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-all shadow-md"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  )
}
