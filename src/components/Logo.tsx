import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useSiteSettings } from '@/lib/useSiteSettings'
import defaultLogo from '@/assets/logo.svg'

interface LogoProps {
  size?: number
  className?: string
  glow?: boolean
  animated?: boolean
  rounded?: string
}

/**
 * Section logo. Uses the custom logo uploaded in Settings → Branding when
 * available, falling back to the default MATIPID mark.
 */
export function Logo({ size = 32, className, glow = true, animated = true, rounded = 'rounded-xl' }: LogoProps) {
  const { data: settings } = useSiteSettings()
  const src = settings?.logoUrl || defaultLogo

  const Wrapper = animated ? motion.div : 'div'
  const motionProps = animated
    ? {
        initial: { opacity: 0, scale: 0.85, rotate: -8 },
        animate: { opacity: 1, scale: 1, rotate: 0 },
        whileHover: { rotate: -6, scale: 1.06 },
        transition: { type: 'spring', stiffness: 300, damping: 20 },
      }
    : {}

  return (
    <Wrapper
      {...(motionProps as object)}
      className={cn(
        'relative flex items-center justify-center flex-shrink-0 overflow-hidden',
        'bg-gradient-to-br from-brand-500/20 via-surface-900 to-brand-900/40',
        'border border-brand-500/20',
        rounded,
        glow && 'shadow-lg shadow-brand-600/30',
        className
      )}
      style={{ width: size, height: size }}
    >
      {glow && (
        <span className="absolute inset-0 bg-gradient-to-tr from-brand-500/0 via-brand-400/10 to-gold-400/10 animate-pulse-slow" />
      )}
      <img src={src} alt="Section logo" className="relative w-[68%] h-[68%] object-contain drop-shadow-md" />
    </Wrapper>
  )
}
