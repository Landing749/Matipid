import { useEffect, useRef, useState } from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, LogIn, ChevronDown } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { Sun, Moon } from 'lucide-react'
import { Toaster } from 'sonner'
import { Logo } from '@/components/Logo'
import { useSiteSettings } from '@/lib/useSiteSettings'
import { CookieConsentBanner } from '@/components/CookieConsentBanner'
import { ClassAnthemPlayer } from '@/components/ClassAnthemPlayer'

// Primary links stay visible in the pill bar; everything else lives under "More".
const primaryLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/announcements', label: 'Announcements' },
  { to: '/events', label: 'Events' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/finances', label: 'Transparency' },
]

const moreLinks = [
  { to: '/timeline', label: 'Timeline' },
  { to: '/year-in-review', label: 'Recap' },
  { to: '/officers', label: 'Officers' },
  { to: '/suggestions', label: 'Suggestions' },
  { to: '/about', label: 'About' },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
    isActive
      ? 'text-brand-700 bg-brand-100'
      : 'text-surface-500 hover:text-surface-100 hover:bg-[rgba(var(--surface-overlay-rgb),0.6)]'
  }`

export function PublicLayout() {
  const [open, setOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const { theme, toggle } = useTheme()
  const { data: settings } = useSiteSettings()
  const sectionName = settings?.section || 'MATIPID'
  const { pathname } = useLocation()
  const moreActive = moreLinks.some((l) => pathname.startsWith(l.to))

  // Close the "More" dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

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
            {primaryLinks.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={navLinkClass}>
                {l.label}
              </NavLink>
            ))}

            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  moreActive
                    ? 'text-brand-700 bg-brand-100'
                    : 'text-surface-500 hover:text-surface-100 hover:bg-[rgba(var(--surface-overlay-rgb),0.6)]'
                }`}
              >
                More
                <ChevronDown size={14} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {moreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-48 clay-panel p-1.5 z-50"
                  >
                    {moreLinks.map((l) => (
                      <NavLink
                        key={l.to}
                        to={l.to}
                        onClick={() => setMoreOpen(false)}
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                            isActive
                              ? 'text-brand-700 bg-brand-100'
                              : 'text-surface-500 hover:text-surface-100 hover:bg-black/5'
                          }`
                        }
                      >
                        {l.label}
                      </NavLink>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title="Toggle theme"
              className="p-2 rounded-full text-surface-500 hover:bg-[rgba(var(--surface-overlay-rgb),0.6)] hover:text-surface-100 transition-all"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link to="/login" className="hidden sm:flex btn-secondary text-xs gap-1.5 py-1.5">
              <LogIn size={14} />
              Officer Login
            </Link>
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="md:hidden p-2 rounded-full text-surface-500 hover:bg-[rgba(var(--surface-overlay-rgb),0.6)] hover:text-surface-100 transition-colors"
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
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="mb-6 text-surface-400 hover:text-surface-100">
                <X size={20} />
              </button>
              <nav className="flex flex-col gap-1">
                {primaryLinks.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `px-3 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                        isActive
                          ? 'text-brand-700 bg-brand-100'
                          : 'text-surface-500 hover:text-surface-100 hover:bg-[rgba(var(--surface-overlay-rgb),0.6)]'
                      }`
                    }
                  >
                    {l.label}
                  </NavLink>
                ))}

                <div className="h-px bg-surface-800/10 my-2" />

                {moreLinks.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `px-3 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                        isActive
                          ? 'text-brand-700 bg-brand-100'
                          : 'text-surface-500 hover:text-surface-100 hover:bg-[rgba(var(--surface-overlay-rgb),0.6)]'
                      }`
                    }
                  >
                    {l.label}
                  </NavLink>
                ))}

                <Link to="/login" onClick={() => setOpen(false)} className="btn-primary mt-4 justify-center">
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

      <Toaster
        position="top-right"
        theme="light"
        toastOptions={{
          style: {
            background: 'var(--clay-fill)',
            border: '1px solid rgba(var(--clay-edge-light-rgb),0.7)',
            color: 'var(--clay-text)',
            boxShadow: '9px 9px 18px rgba(var(--clay-edge-dark-rgb),0.3), -9px -9px 18px rgba(var(--clay-edge-light-rgb),0.85)',
          },
        }}
      />
      <CookieConsentBanner />
      <ClassAnthemPlayer />
    </div>
  )
}
