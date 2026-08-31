import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Music, Pause, Play, VolumeX } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { dbGet } from '@/lib/firebase'
import { CONSENT_ACCEPTED_EVENT } from '@/contexts/ConsentContext'
import type { SiteSettingsBrief } from '@/lib/useSiteSettings'

const MUTE_KEY = 'matipid-anthem-muted'

/** Renders nothing visible until the anthem actually starts playing, then shows a small,
 *  always-reachable control so the sound can be paused instantly — required for
 *  accessibility whenever audio plays automatically. */
export function ClassAnthemPlayer() {
  const { data: settings } = useQuery({
    queryKey: ['settings', 'anthem'],
    queryFn: () => dbGet<SiteSettingsBrief>('settings'),
    staleTime: 1000 * 60 * 5,
  })
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [everStarted, setEverStarted] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    function onAccepted() {
      const url = settings?.anthemAudioUrl
      const previouslyMuted = localStorage.getItem(MUTE_KEY) === '1'
      if (!url || previouslyMuted || !audioRef.current) return
      audioRef.current.src = url
      audioRef.current.volume = 0.5
      audioRef.current
        .play()
        .then(() => {
          setPlaying(true)
          setEverStarted(true)
        })
        .catch(() => {
          // Browser blocked it (e.g. no user-gesture credit left) — fail silently,
          // the visitor simply won't hear the anthem this visit.
        })
    }
    window.addEventListener(CONSENT_ACCEPTED_EVENT, onAccepted)
    return () => window.removeEventListener(CONSENT_ACCEPTED_EVENT, onAccepted)
  }, [settings?.anthemAudioUrl])

  function toggle() {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {})
    }
  }

  function stopForSession() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setPlaying(false)
    localStorage.setItem(MUTE_KEY, '1')
  }

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- instrumental clip, no dialogue to caption */}
      <audio ref={audioRef} onEnded={() => setPlaying(false)} />
      <AnimatePresence>
        {everStarted && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { y: 40, opacity: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { y: 40, opacity: 0 }}
            className="fixed bottom-3 left-3 z-[60]"
            role="region"
            aria-label="Class anthem player"
          >
            <div className="clay rounded-full shadow-clay-sm border border-surface-800/60 bg-surface-900/95 backdrop-blur flex items-center gap-1 p-1.5 pl-3">
              <Music size={14} className="text-brand-600" aria-hidden="true" />
              <span className="text-xs text-surface-400 mr-1 hidden sm:inline">Section anthem</span>
              <button
                onClick={toggle}
                aria-label={playing ? 'Pause section anthem' : 'Play section anthem'}
                aria-pressed={playing}
                className="p-1.5 rounded-full text-surface-300 hover:bg-[rgba(var(--surface-overlay-rgb),0.1)] hover:text-surface-100 transition-colors"
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button
                onClick={stopForSession}
                aria-label="Stop and mute section anthem for this visit"
                className="p-1.5 rounded-full text-surface-400 hover:bg-[rgba(var(--surface-overlay-rgb),0.1)] hover:text-surface-100 transition-colors"
              >
                <VolumeX size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
