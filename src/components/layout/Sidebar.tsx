import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, DollarSign, ShieldCheck, ScrollText, History,
  HardDrive, Activity, BarChart2, Settings, Users, Database,
  Search, ChevronLeft, LogOut, ExternalLink,
  Megaphone, Calendar, Image, Target, BookUser, CalendarDays, Clock
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/Logo'
import { useSiteSettings } from '@/lib/useSiteSettings'

interface NavItem {
  icon: React.ElementType
  label: string
  to: string
  roles?: string[]
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Content',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', to: '/portal/dashboard' },
      { icon: Megaphone, label: 'Announcements', to: '/portal/announcements' },
      { icon: Calendar, label: 'Events', to: '/portal/events' },
      { icon: Clock, label: 'Timeline', to: '/portal/timeline' },
      { icon: CalendarDays, label: 'Calendar', to: '/portal/calendar' },
      { icon: Image, label: 'Gallery', to: '/portal/gallery' },
    ],
  },
  {
    label: 'People',
    items: [
      { icon: Users, label: 'Officers', to: '/portal/officers' },
      { icon: BookUser, label: 'Members', to: '/portal/members' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { icon: DollarSign, label: 'Finance', to: '/portal/finance', roles: ['admin', 'treasurer', 'auditor'] },
      { icon: Target, label: 'Budget', to: '/portal/budget', roles: ['admin', 'treasurer', 'auditor'] },
      { icon: ShieldCheck, label: 'Audit', to: '/portal/audit', roles: ['admin', 'auditor'] },
    ],
  },
  {
    label: 'System',
    items: [
      { icon: ScrollText, label: 'Activity Log', to: '/portal/logs' },
      { icon: History, label: 'Version History', to: '/portal/versions', roles: ['admin'] },
      { icon: HardDrive, label: 'Backup', to: '/portal/backup', roles: ['admin'] },
      { icon: Activity, label: 'System Health', to: '/portal/health', roles: ['admin'] },
      { icon: BarChart2, label: 'Analytics', to: '/portal/analytics' },
      { icon: Database, label: 'Storage', to: '/portal/storage', roles: ['admin'] },
      { icon: Users, label: 'Users', to: '/portal/users', roles: ['admin'] },
      { icon: Settings, label: 'Settings', to: '/portal/settings', roles: ['admin'] },
    ],
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { profile, role, signOut } = useAuth()
  const { data: settings } = useSiteSettings()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.email?.[0]?.toUpperCase() ?? 'U'

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-screen border-r border-surface-800/60 overflow-hidden flex-shrink-0 z-30"
      style={{ background: 'linear-gradient(180deg, #1a1a22 0%, #0f0f14 100%)' }}
    >
      {/* Brand aurora — top glow */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-40 opacity-60"
        style={{ background: 'radial-gradient(ellipse 120% 80% at 50% 0%, rgba(124,26,255,0.18) 0%, transparent 70%)' }} />

      {/* Logo */}
      <div className="relative flex items-center gap-3 px-4 h-[60px] border-b border-surface-800/50 flex-shrink-0">
        <motion.div whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 400 }}>
          <Logo size={34} />
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <p className="text-[13px] font-bold text-surface-100 whitespace-nowrap font-display tracking-tight">
                {settings?.section ?? 'MATIPID'}
              </p>
              <p className="text-[10px] text-surface-500 whitespace-nowrap uppercase tracking-widest">Officer Portal</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-3 pt-3 pb-1"
          >
            <NavLink
              to="/portal/search"
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-surface-800/40 border border-surface-700/30 text-surface-500 text-sm hover:bg-surface-800/70 hover:border-brand-600/30 hover:text-surface-300 transition-all group"
            >
              <Search className="w-3.5 h-3.5 group-hover:text-brand-400 transition-colors flex-shrink-0" />
              <span className="flex-1 text-left text-xs">Search…</span>
              <kbd className="text-[10px] bg-surface-800 border border-surface-700/60 px-1.5 py-0.5 rounded-md text-surface-600 font-mono">⌘K</kbd>
            </NavLink>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-2 px-2.5 space-y-0.5 no-scrollbar">
        {navGroups.map((group) => {
          const visible = group.items.filter(
            (item) => !item.roles || (role && item.roles.includes(role))
          )
          if (visible.length === 0) return null

          return (
            <div key={group.label} className="mb-1">
              {/* Group label */}
              <AnimatePresence>
                {!collapsed ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-2.5 pt-3 pb-1 text-[9.5px] font-semibold text-surface-600 uppercase tracking-[0.14em]"
                  >
                    {group.label}
                  </motion.p>
                ) : (
                  <div className="h-px bg-surface-800/70 mx-1 my-2.5" />
                )}
              </AnimatePresence>

              {/* Items */}
              <div className="space-y-0.5">
                {visible.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 group select-none',
                        isActive
                          ? 'text-brand-200'
                          : 'text-surface-400 hover:bg-surface-800/50 hover:text-surface-100 active:scale-[0.98]',
                        collapsed && 'justify-center px-0 py-2.5'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active bg */}
                        {isActive && (
                          <motion.span
                            layoutId="sidebar-pill"
                            className="absolute inset-0 rounded-xl"
                            style={{
                              background: 'linear-gradient(90deg, rgba(124,26,255,0.22) 0%, rgba(124,26,255,0.06) 60%, transparent 100%)',
                              border: '1px solid rgba(124,26,255,0.2)',
                            }}
                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                          />
                        )}
                        {/* Left accent bar */}
                        {isActive && (
                          <motion.span
                            layoutId="sidebar-bar"
                            className="absolute left-0 top-[5px] bottom-[5px] w-[3px] rounded-full"
                            style={{ background: 'linear-gradient(180deg, #bf99ff 0%, #7c1aff 100%)' }}
                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                          />
                        )}
                        <item.icon
                          size={15}
                          className={cn(
                            'flex-shrink-0 relative z-10 transition-all',
                            isActive ? 'text-brand-300' : 'text-surface-500 group-hover:text-surface-300'
                          )}
                        />
                        <AnimatePresence>
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="whitespace-nowrap relative z-10"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-surface-800/50 p-2.5 space-y-0.5 flex-shrink-0">
        <NavLink
          to="/"
          title={collapsed ? 'Public Site' : undefined}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12px] text-surface-500 hover:bg-surface-800/50 hover:text-surface-300 transition-all group"
        >
          <ExternalLink size={13} className="flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          {!collapsed && <span>Public Site</span>}
        </NavLink>

        {/* Profile chip */}
        <div className={cn(
          'flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-surface-800/40 transition-colors cursor-default',
          collapsed && 'justify-center px-0 py-2'
        )}>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white shadow-md"
            style={{ background: 'linear-gradient(135deg, #8b3dff 0%, #5a0cc4 100%)', boxShadow: '0 0 0 1px rgba(139,61,255,0.4)' }}
          >
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-surface-200 truncate">{profile?.email}</p>
                <p className="text-[10px] text-surface-500 capitalize">{role}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1 text-surface-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <LogOut size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <motion.button
        onClick={() => setCollapsed((v) => !v)}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.9 }}
        className="absolute top-[18px] -right-3 z-50 w-6 h-6 rounded-full bg-surface-800 border border-surface-700/80 flex items-center justify-center text-surface-400 hover:text-brand-300 hover:border-brand-600/50 transition-all shadow-lg"
      >
        <motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.22 }}>
          <ChevronLeft size={11} />
        </motion.span>
      </motion.button>
    </motion.aside>
  )
}
