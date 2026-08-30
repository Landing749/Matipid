import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { MessageCircle, Send, Trash2 } from 'lucide-react'
import { addComment, deleteComment, listenComments, type Comment, type ResourceType } from '@/lib/community'
import { timeAgo } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui'

export function Comments({ resourceType, resourceId }: { resourceType: ResourceType; resourceId: string }) {
  const { isOfficer } = useAuth()
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [name, setName] = useState(() => localStorage.getItem('matipid_commenter_name') ?? '')
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const unsub = listenComments(resourceType, resourceId, setComments)
    return unsub
  }, [resourceType, resourceId])

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
    } catch {
      toast.error('Could not delete comment.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mt-10 pt-8 border-t border-surface-800">
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
            {comments.map((c) => (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="group flex items-start justify-between gap-3 p-3 rounded-xl bg-surface-900/60 border border-surface-800"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-surface-200">{c.name}</span>
                    <span className="text-xs text-surface-600">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-surface-400 whitespace-pre-wrap break-words">{c.text}</p>
                </div>
                {isOfficer && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    title="Delete comment"
                    className="flex-shrink-0 p-1.5 text-surface-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
