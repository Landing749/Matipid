import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  REACTION_EMOJIS,
  getReactionCounts,
  isReactionActive,
  toggleReaction,
  type ResourceType,
} from '@/lib/community'

export function Reactions({ resourceType, resourceId }: { resourceType: ResourceType; resourceId: string }) {
  const [counts, setCounts] = useState<Record<string, number> | null>(null)
  const [active, setActive] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    getReactionCounts(resourceType, resourceId).then(setCounts)
    const a: Record<string, boolean> = {}
    for (const emoji of REACTION_EMOJIS) a[emoji] = isReactionActive(resourceType, resourceId, emoji)
    setActive(a)
  }, [resourceType, resourceId])

  async function handleClick(emoji: string) {
    if (busy) return
    setBusy(emoji)
    try {
      const result = await toggleReaction(resourceType, resourceId, emoji)
      setCounts((prev) => ({ ...prev, [emoji]: result.count }))
      setActive((prev) => ({ ...prev, [emoji]: result.active }))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTION_EMOJIS.map((emoji) => {
        const count = counts?.[emoji] ?? 0
        const isActive = active[emoji]
        return (
          <motion.button
            key={emoji}
            onClick={() => handleClick(emoji)}
            whileTap={{ scale: 0.9 }}
            disabled={busy === emoji}
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border transition-all',
              isActive
                ? 'border-brand-600 bg-brand-600/15 text-brand-500'
                : 'border-surface-700 text-surface-400 hover:border-surface-500 hover:bg-surface-800'
            )}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-xs opacity-80 tabular-nums">{count}</span>}
          </motion.button>
        )
      })}
    </div>
  )
}
