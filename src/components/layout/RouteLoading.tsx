import { Spinner } from '@/components/ui'

/**
 * Fallback shown while a lazy-loaded route chunk (portal pages, Login) is
 * still downloading. Kept intentionally minimal — most of these chunks are
 * small and load fast on a warm cache, so this should rarely linger.
 */
export function RouteLoading() {
  return (
    <div className="flex items-center justify-center min-h-[40vh] w-full">
      <Spinner size={24} />
    </div>
  )
}
