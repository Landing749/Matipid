import { useQuery } from '@tanstack/react-query'
import { Music2 } from 'lucide-react'
import { dbGet } from '@/lib/firebase'
import { toEmbedUrl } from '@/lib/utils'
import type { SiteSettingsBrief } from '@/lib/useSiteSettings'

/** Renders nothing if no anthem link is configured, so it's safe to drop into any page. */
export function AnthemEmbed() {
  const { data: settings } = useQuery({
    queryKey: ['settings', 'anthem'],
    queryFn: () => dbGet<SiteSettingsBrief>('settings'),
    staleTime: 1000 * 60 * 5,
  })

  const embed = settings?.anthemEmbedUrl ? toEmbedUrl(settings.anthemEmbedUrl) : null
  if (!embed) return null

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <div className="icon-tile bg-brand-600/15 text-brand-600">
          <Music2 size={16} />
        </div>
        <h2 className="font-semibold text-surface-100">Section Anthem</h2>
      </div>
      <div className="rounded-2xl overflow-hidden bg-surface-950/60" style={{ aspectRatio: embed.provider === 'spotify' ? '16 / 6' : '16 / 9' }}>
        <iframe
          src={embed.src}
          title="Section MATIPID anthem"
          className="w-full h-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}
