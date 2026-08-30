import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'

export function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center">
            <FileText size={16} className="text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100">Terms of Use</h1>
        </div>
        <p className="text-surface-500 text-sm mb-8">Last updated {new Date().getFullYear()}.</p>

        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold text-surface-100 mb-3">Purpose</h2>
            <p className="text-surface-400 text-sm leading-relaxed">
              This portal exists to keep our section informed and our finances transparent. It's
              intended for section members, parents, and advisers.
            </p>
          </div>

          <div className="card">
            <h2 className="font-semibold text-surface-100 mb-3">Public contributions</h2>
            <p className="text-surface-400 text-sm leading-relaxed">
              Comments, suggestions, and RSVPs are moderated by officers. Content that is abusive,
              spam, or unrelated to the section may be removed without notice.
            </p>
          </div>

          <div className="card">
            <h2 className="font-semibold text-surface-100 mb-3">Officer accounts</h2>
            <p className="text-surface-400 text-sm leading-relaxed">
              Officer accounts are role-restricted and every action is logged in the Activity Log.
              Misuse of an officer account may result in access being revoked.
            </p>
          </div>

          <div className="card">
            <h2 className="font-semibold text-surface-100 mb-3">No warranty</h2>
            <p className="text-surface-400 text-sm leading-relaxed">
              This is a student-run project provided as-is. While we aim for accuracy, always confirm
              anything time-sensitive (deadlines, dues, event details) with a current officer.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
