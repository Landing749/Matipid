import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

type ConsentStatus = 'accepted' | 'declined' | null

interface ConsentContextType {
  status: ConsentStatus
  /** True once the user has made a choice (accept or decline) — banner should hide. */
  resolved: boolean
  accept: () => void
  decline: () => void
  /** Reset so the banner reappears (used by a "Cookie settings" link in the footer). */
  reset: () => void
}

const STORAGE_KEY = 'matipid-consent'
/** Fired on `window` the moment the user clicks Accept. Any user-gesture-dependent
 *  behavior (like starting audio playback) should hook this instead of watching
 *  `status`, since browsers only allow autoplay-with-sound inside a real click handler. */
export const CONSENT_ACCEPTED_EVENT = 'matipid:consent-accepted'

const ConsentContext = createContext<ConsentContextType | null>(null)

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConsentStatus>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'accepted' || stored === 'declined' ? stored : null
  })

  useEffect(() => {
    if (status) localStorage.setItem(STORAGE_KEY, status)
    else localStorage.removeItem(STORAGE_KEY)
  }, [status])

  const accept = useCallback(() => {
    setStatus('accepted')
    // Dispatched synchronously inside the click handler chain so it still counts
    // as a user gesture for browsers' autoplay-with-sound policies.
    window.dispatchEvent(new CustomEvent(CONSENT_ACCEPTED_EVENT))
  }, [])

  const decline = useCallback(() => setStatus('declined'), [])
  const reset = useCallback(() => setStatus(null), [])

  return (
    <ConsentContext.Provider value={{ status, resolved: status !== null, accept, decline, reset }}>
      {children}
    </ConsentContext.Provider>
  )
}

export function useConsent() {
  const ctx = useContext(ConsentContext)
  if (!ctx) throw new Error('useConsent must be inside ConsentProvider')
  return ctx
}
