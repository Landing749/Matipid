import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, AlertTriangle, ShieldAlert, HardDrive, X, CheckCheck } from 'lucide-react'
import { ref, onValue, db } from '@/lib/firebase'
import { formatCurrency, timeAgo } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

interface Notification {
  id: string
  type: 'pending_audit' | 'low_balance' | 'backup_overdue' | 'system'
  title: string
  message: string
  timestamp: number
  link?: string
  read?: boolean
}

const STORAGE_KEY = 'matipid_notif_read'

function loadRead(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveRead(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch {}
}

export function NotificationsPanel() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(loadRead)
  const panelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Build notifications from live Firebase data
  useEffect(() => {
    const notifs: Notification[] = []
    let pendingCount = 0
    let balance = 0
    let lastBackup: number | null = null
    let resolved = 0
    const TOTAL = 3

    function rebuild() {
      resolved++
      if (resolved < TOTAL) return

      const list: Notification[] = []

      if (pendingCount > 0) {
        list.push({
          id: `pending_${pendingCount}`,
          type: 'pending_audit',
          title: 'Pending Transactions',
          message: `${pendingCount} transaction${pendingCount > 1 ? 's' : ''} awaiting audit review.`,
          timestamp: Date.now(),
          link: '/portal/audit',
        })
      }

      if (balance < 0) {
        list.push({
          id: `balance_negative`,
          type: 'low_balance',
          title: 'Negative Balance',
          message: `Current balance is ${formatCurrency(balance)}. Review finances.`,
          timestamp: Date.now(),
          link: '/portal/finance',
        })
      } else if (balance < 500 && balance >= 0) {
        list.push({
          id: `balance_low`,
          type: 'low_balance',
          title: 'Low Balance',
          message: `Section balance is ${formatCurrency(balance)} — running low.`,
          timestamp: Date.now(),
          link: '/portal/finance',
        })
      }

      const threeDays = 3 * 24 * 60 * 60 * 1000
      if (lastBackup === null || Date.now() - lastBackup > threeDays) {
        list.push({
          id: `backup_overdue`,
          type: 'backup_overdue',
          title: 'Backup Overdue',
          message: lastBackup
            ? `Last backup was ${timeAgo(lastBackup)}. Consider backing up.`
            : 'No backup found. Create one in the Backup page.',
          timestamp: Date.now(),
          link: '/portal/backup',
        })
      }

      setNotifications(list)
    }

    const txUnsub = onValue(ref(db, 'transactions'), (snap) => {
      pendingCount = 0
      let income = 0
      let expenses = 0
      if (snap.exists()) {
        snap.forEach((child) => {
          const t = child.val()
          if (t.status === 'pending') pendingCount++
          if (t.status === 'approved') {
            if (t.type === 'income') income += t.amount
            else expenses += t.amount
          }
        })
      }
      balance = income - expenses
      rebuild()
    }, { onlyOnce: true })

    const backupUnsub = onValue(ref(db, 'backups'), (snap) => {
      lastBackup = null
      if (snap.exists()) {
        const dates: number[] = []
        snap.forEach((child) => {
          const b = child.val()
          if (b.createdAt) dates.push(b.createdAt)
        })
        if (dates.length > 0) lastBackup = Math.max(...dates)
      }
      rebuild()
    }, { onlyOnce: true })

    // Third resolve from a dummy call
    rebuild()

    return () => {
      txUnsub()
      backupUnsub()
    }
  }, [])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const unread = notifications.filter((n) => !readIds.has(n.id)).length

  function markAllRead() {
    const newSet = new Set([...readIds, ...notifications.map((n) => n.id)])
    setReadIds(newSet)
    saveRead(newSet)
  }

  function markRead(id: string) {
    const newSet = new Set([...readIds, id])
    setReadIds(newSet)
    saveRead(newSet)
  }

  function handleClick(notif: Notification) {
    markRead(notif.id)
    if (notif.link) {
      navigate(notif.link)
      setOpen(false)
    }
  }

  const typeIcon: Record<string, React.ReactNode> = {
    pending_audit: <ShieldAlert size={14} className="text-yellow-600" />,
    low_balance: <AlertTriangle size={14} className="text-red-600" />,
    backup_overdue: <HardDrive size={14} className="text-brand-600" />,
    system: <Bell size={14} className="text-surface-400" />,
  }

  return (
    <div className="relative" ref={panelRef}>
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => {
          setOpen((v) => !v)
          if (!open && unread > 0) markAllRead()
        }}
        className="p-2 rounded-xl text-surface-400 hover:bg-surface-800 hover:text-surface-100 transition-colors relative"
        title="Notifications"
      >
        <Bell size={16} />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-0.5"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 clay-panel overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-surface-400" />
                <span className="text-sm font-semibold text-surface-200">Notifications</span>
                {unread > 0 && (
                  <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-medium">
                    {unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-surface-500 hover:text-surface-300 flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck size={11} /> All read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="ml-1 text-surface-600 hover:text-surface-300 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="py-10 text-center text-surface-500 text-sm">
                <Bell size={20} className="mx-auto mb-2 opacity-30" />
                All clear — no alerts
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-surface-800/60">
                {notifications.map((notif) => {
                  const isRead = readIds.has(notif.id)
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleClick(notif)}
                      className={`w-full text-left px-4 py-3.5 hover:bg-surface-800/40 transition-colors flex items-start gap-3 ${!isRead ? 'bg-surface-800/20' : ''}`}
                    >
                      <span className="mt-0.5 flex-shrink-0">{typeIcon[notif.type]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${isRead ? 'text-surface-400' : 'text-surface-100'}`}>
                            {notif.title}
                          </p>
                          {!isRead && (
                            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-surface-500 mt-0.5 leading-relaxed">{notif.message}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
