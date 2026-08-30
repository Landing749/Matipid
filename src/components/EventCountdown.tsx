import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

interface Props {
  event: { id: string; title: string; date: number } | null
}

function getParts(msLeft: number) {
  const days = Math.floor(msLeft / 86_400_000)
  const hours = Math.floor((msLeft % 86_400_000) / 3_600_000)
  const minutes = Math.floor((msLeft % 3_600_000) / 60_000)
  return { days, hours, minutes }
}

/** Shows a live countdown to the given event. Renders nothing if there's no
 *  upcoming event or it has already started. */
export function EventCountdown({ event }: Props) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!event) return
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [event])

  if (!event) return null
  const msLeft = event.date - now
  if (msLeft <= 0) return null

  const { days, hours, minutes } = getParts(msLeft)
  const label =
    days > 0
      ? `${days} day${days === 1 ? '' : 's'}${hours > 0 ? ` ${hours}h` : ''}`
      : hours > 0
        ? `${hours}h ${minutes}m`
        : `${minutes} minute${minutes === 1 ? '' : 's'}`

  return (
    <Link
      to={`/events/${event.id}`}
      className="card-hover flex items-center gap-3 !bg-brand-600/10 border border-brand-600/20"
      aria-label={`${label} until ${event.title}. View event details.`}
    >
      <div className="icon-tile bg-brand-600/20 text-brand-600 shrink-0">
        <Sparkles size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-surface-100 truncate">
          {label} until {event.title}
        </p>
        <p className="text-xs text-surface-500">Tap to see the details</p>
      </div>
    </Link>
  )
}
