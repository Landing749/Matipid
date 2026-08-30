import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useSiteSettings } from '@/lib/useSiteSettings'
import defaultLogo from '@/assets/logo-mark.png'

interface LogoProps {
  size?: number
  className?: string
  glow?: boolean
  animated?: boolean
  rounded?: string
}

/**
 * Section logo. Uses the custom logo uploaded in Settings → Branding when
 * available, falling back to the default MATIPID class badge.
 * Rendered as a soft clay "pebble" — a puffy circular frame with the
 * badge artwork sitting slightly recessed inside it.
 */
export function Logo({ size = 32, className, glow = true, animated = true, rounded = 'rounded-full' }: LogoProps) {
  const { data: settings } = useSiteSettings()
  const src = settings?.logoUrl || defaultLogo

  const Wrapper = animated ? motion.div : 'div'
  const motionProps = animated
    ? {
        initial: { opacity: 0, scale: 0.85 },
        animate: { opacity: 1, scale: 1 },
        whileHover: { scale: 1.06 },
        transition: { type: 'spring', stiffness: 300, damping: 20 },
      }
    : {}

  return (
    <Wrapper
      {...(motionProps as object)}
      className={cn(
        'relative flex items-center justify-center flex-shrink-0 p-[10%]',
        rounded,
        className
      )}
      style={{
        width: size,
        height: size,
        background: '#faf5ea',
        boxShadow: glow
          ? '4px 4px 10px rgba(150,132,103,0.35), -4px -4px 10px rgba(255,255,255,0.9)'
          : undefined,
      }}
    >
      <img
        src={src}
        alt="Section logo"
        className={cn('relative w-full h-full object-contain', rounded)}
        style={{ boxShadow: 'inset 1px 1px 3px rgba(150,132,103,0.3)' }}
      />
    </Wrapper>
  )
}
