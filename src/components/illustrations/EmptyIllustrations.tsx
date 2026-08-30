import { motion } from 'framer-motion'

// ─── Shared frame ───────────────────────────────────────────────────────────────
// Every illustration sits inside the same frame: dot grid, dual blobs,
// corner accents, and a dashed orbit ring, so the set reads as one cohesive
// visual family while each foreground scene stays unique.

interface FrameProps {
  id: string
  className?: string
  tone?: 'brand' | 'gold' | 'green'
  children: React.ReactNode
  sparkles?: { x: number; y: number; r: number; delay: number }[]
}

const toneStops: Record<string, [string, string]> = {
  brand: ['#a688dd', '#4c397d'],
  gold: ['#eab765', '#8c5620'],
  green: ['#8ecda9', '#33684d'],
}

function IllustrationFrame({ id, className, tone = 'brand', children, sparkles = [] }: FrameProps) {
  const [c1, c2] = toneStops[tone]

  return (
    <svg viewBox="0 0 200 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Primary blob */}
        <radialGradient id={`blob-${id}`} cx="50%" cy="44%" r="58%">
          <stop offset="0%" stopColor={c1} stopOpacity="0.5" />
          <stop offset="55%" stopColor={c1} stopOpacity="0.14" />
          <stop offset="100%" stopColor={c2} stopOpacity="0" />
        </radialGradient>
        {/* Secondary accent blob */}
        <radialGradient id={`blob2-${id}`} cx="72%" cy="76%" r="38%">
          <stop offset="0%" stopColor={c2} stopOpacity="0.22" />
          <stop offset="100%" stopColor={c2} stopOpacity="0" />
        </radialGradient>
        {/* Dot grid pattern */}
        <pattern id={`dots-${id}`} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="0.9" fill={c1} fillOpacity="0.13" />
        </pattern>
        {/* Vignette mask */}
        <radialGradient id={`vignette-${id}`} cx="50%" cy="50%" r="55%">
          <stop offset="50%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id={`vm-${id}`}>
          <rect width="200" height="160" fill={`url(#vignette-${id})`} />
        </mask>
      </defs>

      {/* Dot grid (vignette-masked so edges fade) */}
      <rect width="200" height="160" fill={`url(#dots-${id})`} mask={`url(#vm-${id})`} />

      {/* Blobs */}
      <ellipse cx="100" cy="80" rx="84" ry="64" fill={`url(#blob-${id})`} />
      <ellipse cx="148" cy="116" rx="44" ry="30" fill={`url(#blob2-${id})`} />

      {/* Orbit ring */}
      <circle cx="100" cy="80" r="70" stroke={c1} strokeOpacity="0.11" strokeWidth="1" fill="none" strokeDasharray="2 9" />

      {/* Corner accent marks */}
      <path d="M 14 11 L 10 11 L 10 15" stroke={c1} strokeOpacity="0.28" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 186 11 L 190 11 L 190 15" stroke={c1} strokeOpacity="0.28" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 14 149 L 10 149 L 10 145" stroke={c1} strokeOpacity="0.28" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 186 149 L 190 149 L 190 145" stroke={c1} strokeOpacity="0.28" strokeWidth="1.5" strokeLinecap="round" />

      {/* Floating scene */}
      <motion.g
        initial={{ y: 0 }}
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {children}
      </motion.g>

      {/* Sparkles */}
      {sparkles.map((s, i) => (
        <motion.circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill="#fbbf24"
          initial={{ opacity: 0.15, scale: 0.7 }}
          animate={{ opacity: [0.15, 1, 0.15], scale: [0.7, 1.2, 0.7] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
        />
      ))}
    </svg>
  )
}

const W = { strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

// ─── 1. Members directory ───────────────────────────────────────────────────

export function EmptyMembers({ className }: { className?: string }) {
  return (
    <IllustrationFrame
      id="members"
      className={className}
      sparkles={[
        { x: 152, y: 42, r: 3, delay: 0 },
        { x: 58, y: 114, r: 2, delay: 0.8 },
      ]}
    >
      <line x1="46" y1="120" x2="154" y2="120" stroke="#3f3f46" strokeWidth="2" strokeDasharray="3 6" strokeLinecap="round" />
      {[-28, 0, 28].map((dx, i) => (
        <g key={i} transform={`translate(${100 + dx} ${i === 1 ? 60 : 70})`}>
          <circle r={i === 1 ? 17 : 13} className={i === 1 ? 'fill-brand-500/25 stroke-brand-300' : 'fill-surface-800 stroke-surface-500'} {...W} />
          <circle cy={i === 1 ? -4 : -3} r={i === 1 ? 6.5 : 5} className={i === 1 ? 'stroke-brand-300' : 'stroke-surface-500'} {...W} />
          <path d={i === 1 ? 'M -9 9 Q 0 -2 9 9' : 'M -7 8 Q 0 -1 7 8'} className={i === 1 ? 'stroke-brand-300' : 'stroke-surface-500'} fill="none" {...W} />
        </g>
      ))}
      <g transform="translate(150 46)">
        <circle r="12" fill="#fbbf24" />
        <path d="M -5 0 H 5 M 0 -5 V 5" stroke="#09090b" strokeWidth="2.2" strokeLinecap="round" />
      </g>
    </IllustrationFrame>
  )
}

// ─── 2. Officers ────────────────────────────────────────────────────────────

export function EmptyOfficers({ className }: { className?: string }) {
  return (
    <IllustrationFrame
      id="officers"
      className={className}
      sparkles={[
        { x: 144, y: 116, r: 2.5, delay: 0.4 },
        { x: 54, y: 52, r: 2, delay: 1 },
      ]}
    >
      <path d="M 92 28 V 40 M 108 28 V 40" stroke="#52525b" strokeWidth="3" strokeLinecap="round" />
      <rect x="64" y="40" width="72" height="86" rx="12" className="fill-surface-800 stroke-brand-400" strokeWidth="2.5" />
      <circle cx="100" cy="72" r="17" className="fill-brand-500/20 stroke-brand-300" {...W} />
      <circle cx="100" cy="68" r="7" className="stroke-brand-300" fill="none" {...W} />
      <path d="M 91 78 Q 100 86 109 78" className="stroke-brand-300" fill="none" {...W} />
      <line x1="78" y1="100" x2="122" y2="100" stroke="#52525b" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" />
      <line x1="78" y1="110" x2="110" y2="110" stroke="#52525b" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" />
      <path d="M 100 100 L 111 124 L 100 118 L 89 124 Z" fill="#fbbf24" />
    </IllustrationFrame>
  )
}

// ─── 3. Users / account management ─────────────────────────────────────────

export function EmptyUsers({ className }: { className?: string }) {
  return (
    <IllustrationFrame
      id="users"
      className={className}
      sparkles={[
        { x: 56, y: 52, r: 2.5, delay: 0.2 },
        { x: 148, y: 50, r: 2, delay: 0.7 },
      ]}
    >
      <circle cx="92" cy="78" r="25" className="fill-surface-800 stroke-brand-400" {...W} />
      <circle cx="92" cy="70" r="8.5" className="stroke-brand-300" fill="none" {...W} />
      <path d="M 77 92 Q 92 78 107 92" className="stroke-brand-300" fill="none" {...W} />
      <g transform="translate(128 92)">
        <rect x="-13" y="-2" width="26" height="19" rx="6" fill="#fbbf24" />
        <path d="M -7 -2 V -11 a 7 7 0 0 1 14 0 V -2" stroke="#fbbf24" fill="none" strokeWidth="3.5" strokeLinecap="round" />
        <circle r="2.8" cx="0" cy="8" fill="#09090b" />
      </g>
    </IllustrationFrame>
  )
}

// ─── 4. Events / calendar ───────────────────────────────────────────────────

export function EmptyEvents({ className }: { className?: string }) {
  return (
    <IllustrationFrame
      id="events"
      className={className}
      sparkles={[
        { x: 146, y: 44, r: 2.5, delay: 0.3 },
        { x: 56, y: 110, r: 2, delay: 0.9 },
      ]}
    >
      <rect x="56" y="42" width="88" height="76" rx="10" className="fill-surface-800 stroke-brand-400" strokeWidth="2.5" />
      <path d="M 56 62 H 144" className="stroke-brand-400" strokeWidth="2.5" />
      <path d="M 76 34 V 50 M 124 34 V 50" className="stroke-brand-300" strokeWidth="3" strokeLinecap="round" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => {
          const isActive = r === 1 && c === 1
          return (
            <rect
              key={`${r}-${c}`}
              x={70 + c * 22}
              y={72 + r * 16}
              width="14"
              height="11"
              rx="3"
              className={isActive ? 'fill-gold-400' : 'fill-surface-700/70'}
            />
          )
        })
      )}
    </IllustrationFrame>
  )
}

// ─── 5. Announcements / megaphone ───────────────────────────────────────────

export function EmptyAnnouncements({ className }: { className?: string }) {
  return (
    <IllustrationFrame
      id="announce"
      className={className}
      sparkles={[
        { x: 146, y: 100, r: 2.5, delay: 0.5 },
        { x: 60, y: 56, r: 2, delay: 1.1 },
      ]}
    >
      <path d="M 56 78 V 96 a 8 8 0 0 0 8 8 h 4 V 70 h -4 a 8 8 0 0 0 -8 8 Z" className="fill-brand-500/25 stroke-brand-300" {...W} />
      <path d="M 68 70 L 122 50 a 6 6 0 0 1 8 6 V 112 a 6 6 0 0 1 -8 6 L 68 96 Z" className="fill-surface-800 stroke-brand-400" strokeWidth="2.5" />
      <path d="M 76 100 L 80 122 a 6 6 0 0 0 12 -2 L 88 96" className="stroke-brand-300" fill="none" {...W} />
      <path d="M 138 70 Q 148 81 138 92" stroke="#fbbf24" fill="none" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 144 62 Q 160 81 144 100" stroke="#fbbf2466" fill="none" strokeWidth="2.5" strokeLinecap="round" />
    </IllustrationFrame>
  )
}

// ─── 6. Gallery / photos ────────────────────────────────────────────────────

export function EmptyGallery({ className }: { className?: string }) {
  return (
    <IllustrationFrame
      id="gallery"
      className={className}
      sparkles={[
        { x: 142, y: 44, r: 2.5, delay: 0.2 },
        { x: 58, y: 116, r: 2, delay: 0.8 },
      ]}
    >
      <g transform="rotate(-8 100 80)">
        <rect x="54" y="46" width="70" height="62" rx="6" className="fill-surface-800 stroke-surface-500" strokeWidth="2" />
        <rect x="60" y="52" width="58" height="42" rx="3" className="fill-surface-900" />
      </g>
      <g transform="rotate(7 100 80)">
        <rect x="70" y="40" width="76" height="68" rx="6" className="fill-surface-800 stroke-brand-400" strokeWidth="2.5" />
        <rect x="77" y="47" width="62" height="44" rx="3" className="fill-brand-500/12" />
        <circle cx="92" cy="64" r="6.5" fill="#fbbf24" />
        <path d="M 80 87 L 98 70 L 112 82 L 132 64 V 91 H 80 Z" className="fill-brand-300/40" />
      </g>
    </IllustrationFrame>
  )
}

// ─── 7. Budget / target ─────────────────────────────────────────────────────

export function EmptyBudget({ className }: { className?: string }) {
  return (
    <IllustrationFrame
      id="budget"
      className={className}
      sparkles={[
        { x: 144, y: 108, r: 2.5, delay: 0.3 },
        { x: 58, y: 50, r: 2, delay: 0.9 },
      ]}
    >
      <circle cx="98" cy="80" r="38" stroke="#3f3f46" strokeWidth="2.5" fill="none" strokeDasharray="5 6" />
      <circle cx="98" cy="80" r="26" className="stroke-brand-400" strokeWidth="2.5" fill="none" />
      <circle cx="98" cy="80" r="14" className="fill-brand-500/25 stroke-brand-300" strokeWidth="2.5" />
      <path d="M 98 80 L 120 54" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
      <circle cx="98" cy="80" r="4" fill="#fbbf24" />
      <g transform="translate(142 106)">
        <circle r="12" fill="#fbbf24" />
        <text x="0" y="4" textAnchor="middle" style={{ font: 'bold 12px sans-serif', fill: '#09090b' }}>₱</text>
      </g>
    </IllustrationFrame>
  )
}

// ─── 8. Finance / wallet ─────────────────────────────────────────────────────

export function EmptyFinance({ className }: { className?: string }) {
  return (
    <IllustrationFrame
      id="finance"
      className={className}
      sparkles={[
        { x: 56, y: 50, r: 2.5, delay: 0.3 },
        { x: 146, y: 108, r: 2, delay: 0.9 },
      ]}
    >
      <rect x="52" y="58" width="96" height="58" rx="10" className="fill-surface-800 stroke-brand-400" strokeWidth="2.5" />
      <path d="M 52 76 H 148" className="stroke-brand-400" strokeWidth="2.5" />
      <rect x="118" y="80" width="22" height="16" rx="4" fill="#fbbf24" />
      <circle cx="129" cy="88" r="2.5" fill="#09090b" />
      <path d="M 64 50 L 100 50 L 92 60 H 72 Z" className="fill-brand-500/30 stroke-brand-300" strokeWidth="2" />
      <line x1="64" y1="98" x2="92" y2="98" stroke="#52525b" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" />
      <line x1="64" y1="106" x2="84" y2="106" stroke="#52525b" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" />
    </IllustrationFrame>
  )
}

// ─── 9. Timeline / milestones ────────────────────────────────────────────────

export function EmptyTimeline({ className }: { className?: string }) {
  return (
    <IllustrationFrame
      id="timeline"
      className={className}
      sparkles={[
        { x: 140, y: 40, r: 2.5, delay: 0.2 },
        { x: 58, y: 118, r: 2, delay: 0.8 },
      ]}
    >
      <path d="M 56 118 C 80 118 76 88 100 88 S 120 52 144 46" stroke="#3f3f46" strokeWidth="2.5" fill="none" strokeDasharray="1 7" strokeLinecap="round" />
      <circle cx="56" cy="118" r="6" className="fill-surface-700 stroke-surface-500" strokeWidth="2" />
      <circle cx="100" cy="88" r="7.5" className="fill-brand-500/25 stroke-brand-300" strokeWidth="2.5" />
      <g transform="translate(144 46)">
        <circle r="10" fill="#fbbf24" />
        <path d="M -3 0 L -1 2.5 L 3.5 -3" stroke="#09090b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </IllustrationFrame>
  )
}

// ─── 10. Audit / shield search ───────────────────────────────────────────────

export function EmptyAudit({ className }: { className?: string }) {
  return (
    <IllustrationFrame
      id="audit"
      className={className}
      sparkles={[
        { x: 134, y: 112, r: 2.5, delay: 0.4 },
        { x: 62, y: 50, r: 2, delay: 1 },
      ]}
    >
      <path d="M 100 40 L 134 50 V 84 C 134 104 119 116 100 122 C 81 116 66 104 66 84 V 50 Z" className="fill-surface-800 stroke-brand-400" strokeWidth="2.5" />
      <circle cx="100" cy="78" r="16" className="fill-brand-500/20 stroke-brand-300" {...W} />
      <line x1="111" y1="89" x2="122" y2="100" className="stroke-brand-300" strokeWidth="3" strokeLinecap="round" />
      <g transform="translate(128 104)">
        <circle r="12" className="fill-surface-900 stroke-gold-400" strokeWidth="2" />
        <path d="M 0 -6 V 0 L 5 4" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" fill="none" />
      </g>
    </IllustrationFrame>
  )
}

// ─── 11. All caught up ────────────────────────────────────────────────────────

export function EmptyAllCaughtUp({ className }: { className?: string }) {
  return (
    <IllustrationFrame
      id="caughtup"
      tone="green"
      className={className}
      sparkles={[
        { x: 56, y: 46, r: 3, delay: 0 },
        { x: 146, y: 54, r: 2.5, delay: 0.5 },
        { x: 140, y: 112, r: 2, delay: 0.9 },
      ]}
    >
      <circle cx="100" cy="82" r="34" className="fill-emerald-500/15 stroke-emerald-400" strokeWidth="2.5" />
      <path d="M 86 82 L 96 92 L 116 70" stroke="#34d399" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </IllustrationFrame>
  )
}

// ─── 12. Activity log ─────────────────────────────────────────────────────────

export function EmptyActivityLog({ className }: { className?: string }) {
  return (
    <IllustrationFrame
      id="log"
      className={className}
      sparkles={[
        { x: 140, y: 108, r: 2.5, delay: 0.3 },
        { x: 60, y: 46, r: 2, delay: 0.8 },
      ]}
    >
      <rect x="60" y="38" width="80" height="92" rx="8" className="fill-surface-800 stroke-brand-400" strokeWidth="2.5" />
      {[52, 66, 80, 94, 108].map((y, i) => (
        <line key={y} x1="72" y1={y} x2={i % 2 === 0 ? 128 : 112} y2={y}
          className={i === 1 ? 'stroke-brand-300' : 'stroke-surface-600'}
          strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={i === 1 ? '0' : '2 5'}
        />
      ))}
      <g transform="translate(138 112)">
        <circle r="14" className="fill-surface-900 stroke-gold-400" strokeWidth="2.5" />
        <path d="M 0 -7 V 0 L 5 4" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </g>
    </IllustrationFrame>
  )
}

// ─── 13. Backup / cloud ───────────────────────────────────────────────────────

export function EmptyBackup({ className }: { className?: string }) {
  return (
    <IllustrationFrame
      id="backup"
      className={className}
      sparkles={[
        { x: 134, y: 42, r: 2.5, delay: 0.4 },
        { x: 56, y: 106, r: 2, delay: 1 },
      ]}
    >
      <path d="M 70 88 a 18 18 0 0 1 4 -35.6 A 24 24 0 0 1 120 50 a 16 16 0 0 1 -2 31.9 Z" className="fill-surface-800 stroke-brand-400" strokeWidth="2.5" />
      <path d="M 90 72 V 100 M 90 72 L 80 82 M 90 72 L 100 82" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="64" y="108" width="72" height="16" rx="4" className="fill-surface-800 stroke-surface-500" strokeWidth="2" />
      <circle cx="124" cy="116" r="3" className="fill-brand-300" />
    </IllustrationFrame>
  )
}

// ─── 14. Version history ──────────────────────────────────────────────────────

export function EmptyVersionHistory({ className }: { className?: string }) {
  return (
    <IllustrationFrame
      id="history"
      className={className}
      sparkles={[
        { x: 144, y: 100, r: 2.5, delay: 0.3 },
        { x: 54, y: 54, r: 2, delay: 0.8 },
      ]}
    >
      {/* Trunk */}
      <line x1="68" y1="112" x2="68" y2="54" stroke="#52525b" strokeWidth="2.5" strokeLinecap="round" />
      {/* Branch to node at 86 */}
      <path d="M 68 86 Q 68 86 84 86" stroke="#52525b" strokeWidth="2.5" strokeLinecap="round" fill="none" strokeDasharray="2 5" />
      {/* Branch to node at 54 */}
      <path d="M 68 66 Q 68 66 84 66" stroke="#52525b" strokeWidth="2.5" strokeLinecap="round" fill="none" strokeDasharray="2 5" />
      {/* Trunk node */}
      <circle cx="68" cy="112" r="6" className="fill-surface-700 stroke-surface-500" strokeWidth="2" />
      {/* Branch nodes */}
      <circle cx="90" cy="86" r="7" className="fill-brand-500/25 stroke-brand-300" strokeWidth="2.5" />
      <circle cx="90" cy="66" r="7" className="fill-surface-800 stroke-surface-600" strokeWidth="2" />
      {/* Latest commit star */}
      <g transform="translate(130 72)">
        <circle r="13" fill="#fbbf24" />
        <path d="M 0 -6 V 0 L 4.5 3.5" stroke="#09090b" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </g>
    </IllustrationFrame>
  )
}

// ─── 15. Search / no results ──────────────────────────────────────────────────

export function EmptySearch({ className }: { className?: string }) {
  return (
    <IllustrationFrame
      id="search"
      className={className}
      sparkles={[
        { x: 60, y: 50, r: 2.5, delay: 0.2 },
        { x: 144, y: 110, r: 2, delay: 0.7 },
      ]}
    >
      <circle cx="92" cy="74" r="28" className="fill-surface-800 stroke-brand-400" strokeWidth="3" />
      <circle cx="92" cy="74" r="28" stroke="#3f3f46" strokeWidth="1.5" fill="none" strokeDasharray="3 6" />
      <line x1="112" y1="94" x2="134" y2="116" className="stroke-brand-400" strokeWidth="6" strokeLinecap="round" />
      <path d="M 82 74 L 102 74 M 92 64 L 92 84" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round"
        transform="rotate(45 92 74)" />
    </IllustrationFrame>
  )
}

// ─── 16. Not found ────────────────────────────────────────────────────────────

export function EmptyNotFound({ className }: { className?: string }) {
  return (
    <IllustrationFrame
      id="notfound"
      className={className}
      sparkles={[
        { x: 138, y: 108, r: 2.5, delay: 0.3 },
        { x: 58, y: 48, r: 2, delay: 0.8 },
      ]}
    >
      <rect x="62" y="36" width="76" height="92" rx="8" className="fill-surface-800 stroke-surface-500" strokeWidth="2.5" strokeDasharray="4 6" />
      <line x1="74" y1="56" x2="112" y2="56" stroke="#52525b" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="74" y1="68" x2="100" y2="68" stroke="#52525b" strokeWidth="2.5" strokeLinecap="round" />
      <g transform="translate(100 96)">
        <circle r="21" className="fill-brand-500/20 stroke-brand-300" strokeWidth="2.5" />
        <path d="M -5 -6 a 5 5 0 1 1 8 4 c -2 1.5 -3 2.5 -3 5" className="stroke-brand-300" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cy="9.5" r="1.8" className="fill-brand-300" />
      </g>
    </IllustrationFrame>
  )
}
