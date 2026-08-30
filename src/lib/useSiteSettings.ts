import { useQuery } from '@tanstack/react-query'
import { dbGet } from '@/lib/firebase'

export interface SiteSettingsBrief {
  siteTitle?: string
  section?: string
  logoUrl?: string
  /** Direct link to a short .mp3 — played once when a visitor accepts the cookie banner, and available in the mini player. */
  anthemAudioUrl?: string
  /** YouTube or Spotify URL for the full playlist/anthem embed shown on Home/About. */
  anthemEmbedUrl?: string
}

export function useSiteSettings() {
  return useQuery({
    queryKey: ['settings', 'brief'],
    queryFn: () => dbGet<SiteSettingsBrief>('settings'),
    staleTime: 1000 * 60 * 5,
  })
}
