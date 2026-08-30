import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { MessageCircle, Send, Trash2, Flag, ShieldAlert } from 'lucide-react'
import {
  addComment,
  deleteComment,
  listenComments,
  listenCommentReports,
  reportComment,
  dismissCommentReport,
  hasReportedComment,
  type Comment,
  type ResourceType,
} from '@/lib/community'
import { timeAgo } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui'

export function Comments({
  resourceType,
  resourceId,
  compact = false,
}: {
  resourceType: ResourceType
  resourceId: string
  /** Drops the top margin/divider — use inside panels like the photo lightbox. */
  compact?: boolean
}) {
  const { isOfficer } = useAuth()
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [name, setName] = useState(() => localStorage.getItem('matipid_commenter_name') ?? '')
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({})
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set())
  const [dismissingId, setDismissingId] = useState<string | null>(null)

  useEffect(() => {
    const unsub = listenComments(resourceType, resourceId, setComments)
    return unsub
  }, [resourceType, resourceId])

  useEffect(() => {
    const unsub = listenCommentReports(resourceType, resourceId, setReportCounts)
    return unsub
  }, [resourceType, resourceId])

  async function handleReport(id: string) {
    if (hasReportedComment(resourceType, resourceId, id)) return
    setReportedIds((prev) => new Set(prev).add(id))
    const result = await reportComment(resourceType, resourceId, id)
    if (result === null) {
      toast.error('Could not report that comment.')
    } else {
      toast.success('Thanks — an officer will take a look.')
    }
  }

  async function handleDismissReport(id: string) {
    setDismissingId(id)
    try {
      await dismissCommentReport(resourceType, resourceId, id)
    } catch {
      toast.error('Could not clear that report.')
    } finally {
      setDismissingId(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    if (trimmed.length > 1000) {
      toast.error('Comments are limited to 1000 characters.')
      return
    }
    setSubmitting(true)
    try {
      await addComment(resourceType, resourceId, name, trimmed)
      localStorage.setItem('matipid_commenter_name', name.trim())
      setText('')
      toast.success('Comment posted')
    } catch {
      toast.error('Could not post your comment — try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteComment(resourceType, resourceId, id)
      if (reportCounts[id]) await dismissCommentReport(resourceType, resourceId, id)
    } catch {
      toast.error('Could not delete comment.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={compact ? '' : 'mt-10 pt-8 border-t border-surface-800'}>
      <div className="flex items-center gap-2 mb-5">
        <MessageCircle size={15} className="text-surface-500" />
        <h2 className="text-sm font-semibold text-surface-200">
          Comments {comments && comments.length > 0 ? `(${comments.length})` : ''}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Your name (optional)"
          className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-surface-800 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500 transition-colors"
        />
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Share a thought…"
            className="flex-1 px-3 py-2 rounded-lg bg-surface-900 border border-surface-800 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? <Spinner size={14} /> : <Send size={13} />}
            Post
          </button>
        </div>
      </form>

      {comments === null ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-surface-600 text-center py-4">Be the first to comment.</p>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {comments.map((c) => {
              const reportCount = reportCounts[c.id] ?? 0
              const reported = reportedIds.has(c.id) || hasReportedComment(resourceType, resourceId, c.id)
              return (
                <motion.li
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`group flex items-start justify-between gap-3 p-3 rounded-xl border ${
                    isOfficer && reportCount > 0
                      ? 'bg-red-500/5 border-red-500/30'
                      : 'bg-surface-900/60 border-surface-800'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium text-surface-200">{c.name}</span>
                      <span className="text-xs text-surface-600">{timeAgo(c.createdAt)}</span>
                      {isOfficer && reportCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                          <ShieldAlert size={11} />
                          Reported ×{reportCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-surface-400 whitespace-pre-wrap break-words">{c.text}</p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1">
                    {!isOfficer && (
                      <button
                        onClick={() => handleReport(c.id)}
                        disabled={reported}
                        title={reported ? 'Reported' : 'Report comment'}
                        className={`p-1.5 rounded-lg transition-all disabled:opacity-50 ${
                          reported
                            ? 'text-orange-500'
                            : 'text-surface-600 hover:text-orange-500 hover:bg-orange-500/10 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Flag size={13} className={reported ? 'fill-orange-500' : ''} />
                      </button>
                    )}
                    {isOfficer && reportCount > 0 && (
                      <button
                        onClick={() => handleDismissReport(c.id)}
                        disabled={dismissingId === c.id}
                        title="Dismiss report"
                        className="px-2 py-1 rounded-lg text-[11px] font-medium text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    )}
                    {isOfficer && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        title="Delete comment"
                        className="p-1.5 text-surface-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
