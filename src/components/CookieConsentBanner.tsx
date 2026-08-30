import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Cookie } from 'lucide-react'
import { useConsent } from '@/contexts/ConsentContext'

export function CookieConsentBanner() {
  const { resolved, accept, decline } = useConsent()
  const acceptRef = useRef<HTMLButtonElement>(null)
  const prefersReducedMotion = useReducedMotion()

  // Move focus to the primary action when the banner appears, so keyboard and
  // screen-reader users land on it immediately instead of having to hunt for it.
  useEffect(() => {
    if (!resolved) acceptRef.current?.focus()
  }, [resolved])

  return (
    <AnimatePresence>
      {!resolved && (
        <motion.div
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-consent-title"
          aria-describedby="cookie-consent-desc"
          initial={prefersReducedMotion ? { opacity: 0 } : { y: 80, opacity: 0 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-[60]"
        >
          <div className="clay rounded-3xl p-5 shadow-clay-sm border border-surface-800/60 bg-surface-900/95 backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="icon-tile bg-brand-600/15 text-brand-600 shrink-0">
                <Cookie size={16} />
              </div>
              <div className="min-w-0">
                <h2 id="cookie-consent-title" className="text-sm font-semibold text-surface-100 mb-1">
                  Cookies & Privacy
                </h2>
                <p id="cookie-consent-desc" className="text-xs text-surface-400 leading-relaxed">
                  We use local storage to remember your theme and preferences. No personal data is
                  sold or shared. Read our{' '}
                  <Link to="/privacy" className="underline text-brand-600 hover:text-brand-700">
                    Privacy Policy
                  </Link>{' '}
                  and{' '}
                  <Link to="/terms" className="underline text-brand-600 hover:text-brand-700">
                    Terms
                  </Link>
                  .
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button ref={acceptRef} onClick={accept} className="btn-primary text-xs py-2 flex-1">
                Accept
              </button>
              <button onClick={decline} className="btn-secondary text-xs py-2 flex-1">
                Decline
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
