import { useQuery } from '@tanstack/react-query'
import { dbGet } from '@/lib/firebase'

export interface SiteSettingsBrief {
  siteTitle?: string
  section?: string
  logoUrl?: string
}

export function useSiteSettings() {
  return useQuery({
    queryKey: ['settings', 'brief'],
    queryFn: () => dbGet<SiteSettingsBrief>('settings'),
    staleTime: 1000 * 60 * 5,
  })
}
