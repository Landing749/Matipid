import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Compass, ArrowRight, Home } from 'lucide-react'

const shortcuts = [
  { to: '/announcements', label: 'Announcements' },
  { to: '/events', label: 'Events' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/finances', label: 'Transparency' },
]

export function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20 text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="w-14 h-14 rounded-2xl bg-brand-600/20 flex items-center justify-center mx-auto mb-6">
          <Compass size={26} className="text-brand-600" />
        </div>
        <p className="text-sm font-mono text-surface-500 mb-2">404</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-100 mb-3">This page doesn't exist</h1>
        <p className="text-surface-400 text-sm mb-8 max-w-md mx-auto">
          The link you followed may be broken, or the page may have moved. Here's how to get back on track.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Link to="/" className="btn-primary gap-2">
            <Home size={16} />
            Back to Home
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {shortcuts.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-surface-700 text-surface-400 hover:text-surface-100 hover:border-surface-500 hover:bg-surface-800 transition-all"
            >
              {s.label}
              <ArrowRight size={11} />
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
