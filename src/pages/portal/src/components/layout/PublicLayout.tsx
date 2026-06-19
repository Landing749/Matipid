import { useState } from 'react'
import { Outlet, NavLink, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, LogIn } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { Sun, Moon } from 'lucide-react'
import { Toaster } from 'sonner'
import { Logo } from '@/components/Logo'
import { useSiteSettings } from '@/lib/useSiteSettings'

const navLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/announcements', label: 'Announcements' },
  { to: '/events', label: 'Events' },
  { to: '/timeline', label: 'Timeline' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/finances', label: 'Transparency' },
  { to: '/officers', label: 'Officers' },
  { to: '/about', label: 'About' },
]

export function PublicLayout() {
  const [open, setOpen] = useState(false)
  const { theme, toggle } = useTheme()
  const { data: settings } = useSiteSettings()
  const sectionName = settings?.section || 'MATIPID'

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-surface-800/60 bg-surface-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <Logo size={34} />
            <span className="font-bold text-surface-100 group-hover:text-brand-300 transition-colors">{sectionName}</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'text-brand-300 bg-brand-600/10'
                      : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/60'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="p-2 rounded-xl text-surface-400 hover:bg-surface-800 hover:text-surface-100 transition-all"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link to="/login" className="hidden sm:flex btn-secondary text-xs gap-1.5 py-1.5">
              <LogIn size={14} />
              Officer Login
            </Link>
            <button
              onClick={() => setOpen(true)}
              className="md:hidden p-2 text-surface-400 hover:text-surface-100 transition-colors"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 md:hidden"
          >
            <div className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute right-0 top-0 bottom-0 w-64 bg-surface-900 border-l border-surface-800 p-6"
            >
              <button onClick={() => setOpen(false)} className="mb-6 text-surface-400 hover:text-surface-100">
                <X size={20} />
              </button>
              <nav className="flex flex-col gap-1">
                {navLinks.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'text-brand-300 bg-brand-600/10'
                          : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/60'
                      }`
                    }
                  >
                    {l.label}
                  </NavLink>
                ))}
                <Link to="/login" className="btn-primary mt-4 justify-center">
                  Officer Login
                </Link>
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-800/60 bg-surface-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size={24} animated={false} rounded="rounded-md" />
            <span className="text-sm font-medium text-surface-400">{sectionName}</span>
          </div>
          <p className="text-xs text-surface-600">Grade 8 • Section Management & Transparency Platform</p>
          <p className="text-xs text-surface-600">© {new Date().getFullYear()} ATH Studios</p>
        </div>
      </footer>

      <Toaster position="top-right" theme="dark" />
    </div>
  )
}
