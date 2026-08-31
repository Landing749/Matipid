import { Suspense } from 'react'
import { useLocation, Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { RouteLoading } from './RouteLoading'

/**
 * Wraps routed page content with a smooth fade/slide transition whenever
 * the location changes — gives the portal an app-like feel. Also holds the
 * single Suspense boundary that covers every lazy-loaded /portal/* page.
 */
export function PageTransition() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <Suspense fallback={<RouteLoading />}>
          <Outlet />
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}
