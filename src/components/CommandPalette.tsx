import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, LayoutDashboard, DollarSign, ShieldCheck, ScrollText,
  History, HardDrive, Activity, BarChart2, Settings, Users,
  Database, Home, Megaphone, Calendar, Image, Eye, X, Camera
} from 'lucide-react'

interface Command {
  id: string
  label: string
  description?: string
  icon: React.ElementType
  to: string
  category: string
}

const commands: Command[] = [
  // Portal — Content
  { id: 'announcements-mgr', label: 'Announcements', icon: Megaphone, to: '/portal/announcements', category: 'Content' },
  { id: 'events-mgr', label: 'Events', icon: Calendar, to: '/portal/events', category: 'Content' },
  { id: 'gallery-mgr', label: 'Gallery', icon: Image, to: '/portal/gallery', category: 'Content' },
  { id: 'photo-submissions', label: 'Photo Submissions', icon: Camera, to: '/portal/photo-submissions', category: 'Content' },
  { id: 'officers-mgr', label: 'Officers', icon: Users, to: '/portal/officers', category: 'Content' },
  // Portal — Admin
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/portal/dashboard', category: 'Portal' },
  { id: 'finance', label: 'Finance', icon: DollarSign, to: '/portal/finance', category: 'Portal' },
  { id: 'audit', label: 'Audit', icon: ShieldCheck, to: '/portal/audit', category: 'Portal' },
  { id: 'logs', label: 'Activity Log', icon: ScrollText, to: '/portal/logs', category: 'Portal' },
  { id: 'versions', label: 'Version History', icon: History, to: '/portal/versions', category: 'Portal' },
  { id: 'backup', label: 'Backup', icon: HardDrive, to: '/portal/backup', category: 'Portal' },
  { id: 'health', label: 'System Health', icon: Activity, to: '/portal/health', category: 'Portal' },
  { id: 'analytics', label: 'Analytics', icon: BarChart2, to: '/portal/analytics', category: 'Portal' },
  { id: 'storage', label: 'Storage Manager', icon: Database, to: '/portal/storage', category: 'Portal' },
  { id: 'users', label: 'User Management', icon: Users, to: '/portal/users', category: 'Portal' },
  { id: 'settings', label: 'Settings', icon: Settings, to: '/portal/settings', category: 'Portal' },
  // Public
  { id: 'home', label: 'Home', icon: Home, to: '/', category: 'Public' },
  { id: 'ann-pub', label: 'Announcements', icon: Megaphone, to: '/announcements', category: 'Public' },
  { id: 'events-pub', label: 'Events', icon: Calendar, to: '/events', category: 'Public' },
  { id: 'gallery-pub', label: 'Gallery', icon: Image, to: '/gallery', category: 'Public' },
  { id: 'share-photos-pub', label: 'Share Your Photos', icon: Camera, to: '/share-photos', category: 'Public' },
  { id: 'transparency', label: 'Financial Transparency', icon: Eye, to: '/finances', category: 'Public' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const filtered = commands.filter(
    (c) =>
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    setSelected(0)
  }, [query])

  function execute(cmd: Command) {
    navigate(cmd.to)
    setOpen(false)
    setQuery('')
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((v) => Math.min(v + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((v) => Math.max(v - 1, 0))
    } else if (e.key === 'Enter' && filtered[selected]) {
      execute(filtered[selected])
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
        >
          <div className="absolute inset-0 scrim backdrop-blur-sm" onClick={() => setOpen(false)} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full max-w-lg mx-4 clay-panel overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 border-b border-surface-800/60">
              <Search size={16} className="text-surface-400 flex-shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Search commands…"
                className="flex-1 py-4 bg-transparent text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none"
              />
              <button onClick={() => setOpen(false)} className="text-surface-500 hover:text-surface-300">
                <X size={14} />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-surface-500">No commands found.</p>
              ) : (
                filtered.map((cmd, i) => (
                  <button
                    key={cmd.id}
                    onClick={() => execute(cmd)}
                    onMouseEnter={() => setSelected(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      selected === i ? 'bg-brand-100 text-brand-700' : 'text-surface-300 hover:bg-surface-800/50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      selected === i ? 'bg-brand-200' : 'bg-surface-800'
                    }`}>
                      <cmd.icon size={14} className={selected === i ? 'text-brand-700' : 'text-surface-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{cmd.label}</p>
                    </div>
                    <span className="text-xs text-surface-600">{cmd.category}</span>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-surface-800/60 px-4 py-2 flex items-center gap-4 text-xs text-surface-600">
              <span><kbd className="font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="font-mono">↵</kbd> open</span>
              <span><kbd className="font-mono">esc</kbd> close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
