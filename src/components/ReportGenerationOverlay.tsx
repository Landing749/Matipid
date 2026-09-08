import { AnimatePresence, motion } from 'framer-motion'
import { Building2 } from 'lucide-react'

/**
 * Generating the report is no longer a single `fetch()` to the Worker —
 * it's several in-browser steps (reading records, drawing pages, sealing
 * with a verification code) that take a visible moment, especially on
 * mobile. This gives that moment a home instead of the buttons just
 * looking frozen.
 */
export function ReportGenerationOverlay({ open, step, steps }: { open: boolean; step: number; steps: string[] }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-surface-950/70 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-[300px] rounded-2xl border border-surface-800 bg-surface-900 p-6 text-center shadow-2xl"
          >
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(116,88,189,0.12)', border: '1px solid rgba(116,88,189,0.25)' }}
            >
              <Building2 size={26} className="text-brand-500" />
            </motion.div>
            <p className="text-sm font-semibold text-surface-100 mb-1">Building your report</p>
            <p className="text-xs text-surface-500 mb-4 min-h-[16px]">{steps[step] ?? 'Finishing up\u2026'}</p>
            <div className="h-1.5 rounded-full bg-surface-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-600 to-gold-500"
                animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
