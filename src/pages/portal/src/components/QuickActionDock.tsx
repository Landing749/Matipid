import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Plus, X, DollarSign, Megaphone, Calendar, Users, Target } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

interface Action {
  icon: React.ElementType
  label: string
  to: string
  color: string
  roles?: string[]
  query?: string
}

const ACTIONS: Action[] = [
  {
    icon: DollarSign,
    label: 'Add Transaction',
    to: '/portal/finance',
    color: 'bg-emerald-600 hover:bg-emerald-500',
    roles: ['admin', 'treasurer', 'auditor'],
    query: '?action=new',
  },
  {
    icon: Megaphone,
    label: 'New Announcement',
    to: '/portal/announcements',
    color: 'bg-gold-600 hover:bg-gold-500',
    query: '?action=new',
  },
  {
    icon: Calendar,
    label: 'New Event',
    to: '/portal/events',
    color: 'bg-brand-600 hover:bg-brand-500',
    query: '?action=new',
  },
  {
    icon: Users,
    label: 'Add Member',
    to: '/portal/members',
    color: 'bg-purple-600 hover:bg-purple-500',
    roles: ['admin'],
    query: '?action=new',
  },
  {
    icon: Target,
    label: 'Budget Goal',
    to: '/portal/budget',
    color: 'bg-red-600 hover:bg-red-500',
    roles: ['admin'],
    query: '?action=new',
  },
]

import type { Variants } from 'framer-motion'

const staggerVariants: Variants = {
  open: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: (i as number) * 0.06, duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
  closed: {
    opacity: 0,
    y: 12,
    scale: 0.85,
    transition: { duration: 0.12 },
  },
}

export function QuickActionDock() {
  const [open, setOpen] = useState(false)
  const { role } = useAuth()
  const navigate = useNavigate()

  const visible = ACTIONS.filter((a) => !a.roles || (role && a.roles.includes(role)))

  function handleAction(action: Action) {
    navigate(action.to + (action.query ?? ''))
    setOpen(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {/* Action buttons */}
      <AnimatePresence>
        {open && (
          <div className="flex flex-col items-end gap-2">
            {visible.map((action, i) => (
              <motion.div
                key={action.to}
                custom={visible.length - 1 - i}
                variants={staggerVariants}
                initial="closed"
                animate="open"
                exit="closed"
                className="flex items-center gap-2"
              >
                <span className="bg-surface-900/90 backdrop-blur-sm border border-surface-700/60 text-surface-200 text-xs px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                  {action.label}
                </span>
                <button
                  onClick={() => handleAction(action)}
                  className={cn(
                    'w-10 h-10 rounded-full text-white shadow-lg flex items-center justify-center transition-all',
                    action.color
                  )}
                >
                  <action.icon size={16} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((v) => !v)}
        className="w-13 h-13 w-14 h-14 rounded-full bg-brand-600 hover:bg-brand-500 text-white shadow-xl shadow-brand-600/30 flex items-center justify-center transition-colors ring-2 ring-brand-500/40"
      >
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus size={22} />
        </motion.span>
      </motion.button>
    </div>
  )
}
