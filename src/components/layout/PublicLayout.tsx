import { useState } from 'react'
import { Outlet, NavLink, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, LogIn } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { Sun, Moon } from 'lucide-react'
import { Toaster } from 'sonner'
import { Logo } from '@/components/Logo'
import { useSiteSettings } from '@/lib/useSiteSettings'
import { CookieConsentBanner } from '@/components/CookieConsentBanner'
import { ClassAnthemPlayer } from '@/components/ClassAnthemPlayer'

const navLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/announcements', label: 'Announcements' },
  { to: '/events', label: 'Events' },
  { to: '/timeline', label: 'Timeline' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/finances', label: 'Transparency' },
  { to: '/year-in-review', label: 'Recap' },
  { to: '/officers', label: 'Officers' },
  { to: '/suggestions', label: 'Suggestions' },
  { to: '/about', label: 'About' },
]

export function PublicLayout() {
  const [open, setOpen] = useState(false)
  const { theme, toggle } = useTheme()
  const { data: settings } = useSiteSettings()
  const sectionName = settings?.section || 'MATIPID'

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 flex flex-col">
      {/* Nav — floating clay pill bar */}
      <header className="sticky top-3 z-50 px-3 sm:px-6">
        <div className="max-w-6xl mx-auto glass rounded-full shadow-clay-sm flex items-center justify-between h-14 px-3 sm:px-4">
          <Link to="/" className="flex items-center gap-2.5 group pl-1">
            <Logo size={32} />
            <span className="font-bold text-surface-100 group-hover:text-brand-600 transition-colors">{sectionName}</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? 'text-brand-700 bg-brand-100'
                      : 'text-surface-500 hover:text-surface-100 hover:bg-white/60'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggle}
              className="p-2 rounded-full text-surface-500 hover:bg-white/60 hover:text-surface-100 transition-all"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link to="/login" className="hidden sm:flex btn-secondary text-xs gap-1.5 py-1.5">
              <LogIn size={14} />
              Officer Login
            </Link>
            <button
              onClick={() => setOpen(true)}
              className="md:hidden p-2 rounded-full text-surface-500 hover:bg-white/60 hover:text-surface-100 transition-colors"
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
            <div className="absolute inset-0 bg-surface-50/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute right-3 top-3 bottom-3 w-64 clay rounded-4xl p-6"
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
                      `px-3 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                        isActive
                          ? 'text-brand-700 bg-brand-100'
                          : 'text-surface-500 hover:text-surface-100 hover:bg-white/60'
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
      <footer className="px-3 sm:px-6 pb-6 pt-2">
        <div className="max-w-6xl mx-auto clay rounded-4xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size={26} animated={false} />
            <span className="text-sm font-semibold text-surface-400">{sectionName}</span>
          </div>
          <p className="text-xs text-surface-500">Grade 8 • Section Management & Transparency Platform</p>
          <div className="flex items-center gap-3">
            <Link to="/privacy" className="text-xs text-surface-500 hover:text-surface-300 underline">Privacy</Link>
            <Link to="/terms" className="text-xs text-surface-500 hover:text-surface-300 underline">Terms</Link>
            <p className="text-xs text-surface-500">© {new Date().getFullYear()} ATH Studios</p>
          </div>
        </div>
      </footer>

      <Toaster position="top-right" theme="light" />
      <CookieConsentBanner />
      <ClassAnthemPlayer />
    </div>
  )
}
