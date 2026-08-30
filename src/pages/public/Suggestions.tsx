import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Lightbulb, Send, CheckCircle2 } from 'lucide-react'
import { submitSuggestion } from '@/lib/community'
import { Spinner } from '@/components/ui'

const CATEGORIES = ['General', 'Events', 'Finance', 'Announcements', 'Officers', 'Website / Portal', 'Other'] as const

export function Suggestions() {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('General')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) return
    if (trimmed.length > 2000) {
      toast.error('Please keep suggestions under 2000 characters.')
      return
    }
    setSubmitting(true)
    try {
      await submitSuggestion(category, trimmed, name)
      setSent(true)
      setMessage('')
      setName('')
    } catch {
      toast.error('Could not submit — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gold-500/20 flex items-center justify-center">
            <Lightbulb size={17} className="text-gold-700" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100">Suggestions &amp; Feedback</h1>
        </div>
        <p className="text-sm text-surface-500 mb-8">
          Have an idea, concern, or feedback for the section officers? Your name is optional — leave it blank
          to submit anonymously. Only officers can read these.
        </p>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card flex flex-col items-center text-center gap-3 py-10"
          >
            <CheckCircle2 size={32} className="text-clay-600" />
            <p className="font-semibold text-surface-100">Thanks — your suggestion was sent.</p>
            <button onClick={() => setSent(false)} className="text-sm text-brand-600 hover:text-brand-500 transition-colors">
              Submit another
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <label className="label">Your name (optional)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="Leave blank to stay anonymous"
                className="input"
              />
            </div>

            <div>
              <label className="label">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="input">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Your suggestion</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                rows={5}
                placeholder="What would make the section better?"
                className="input resize-none"
                required
              />
              <p className="text-[11px] text-surface-600 mt-1 text-right">{message.length}/2000</p>
            </div>

            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="btn-primary w-full"
            >
              {submitting ? <Spinner size={16} /> : <Send size={14} />}
              Send Suggestion
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}
