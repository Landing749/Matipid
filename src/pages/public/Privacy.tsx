import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'

export function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center">
            <ShieldCheck size={16} className="text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100">Privacy Policy</h1>
        </div>
        <p className="text-surface-500 text-sm mb-8">Last updated {new Date().getFullYear()}.</p>

        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold text-surface-100 mb-3">What we store</h2>
            <p className="text-surface-400 text-sm leading-relaxed">
              This site uses your browser's local storage — not tracking cookies — to remember your
              theme preference, whether you've accepted this notice, and whether you've muted the
              section anthem. Nothing here is sent to advertisers, and we don't run any analytics or
              ad-tracking scripts.
            </p>
          </div>

          <div className="card">
            <h2 className="font-semibold text-surface-100 mb-3">Account data</h2>
            <p className="text-surface-400 text-sm leading-relaxed">
              Officer accounts (Admin, Treasurer, Auditor) are authenticated through Firebase and can
              access section records relevant to their role. Public visitors can submit suggestions,
              RSVPs, and comments; these are stored in our Firebase Realtime Database and are visible
              to officers for moderation.
            </p>
          </div>

          <div className="card">
            <h2 className="font-semibold text-surface-100 mb-3">Third-party services</h2>
            <p className="text-surface-400 text-sm leading-relaxed">
              Photos and files are hosted via Cloudinary. If a section anthem or playlist is
              configured, it may be embedded from YouTube or Spotify, which have their own privacy
              policies for anything played through their embedded players.
            </p>
          </div>

          <div className="card">
            <h2 className="font-semibold text-surface-100 mb-3">Questions</h2>
            <p className="text-surface-400 text-sm leading-relaxed">
              Reach out to any current section officer if you have questions about how your
              information is handled.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
