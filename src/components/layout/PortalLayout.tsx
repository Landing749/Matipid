import { Sidebar } from './Sidebar'
import { PortalHeader } from './PortalHeader'
import { PageTransition } from './PageTransition'
import { CommandPalette } from '@/components/CommandPalette'
import { QuickActionDock } from '@/components/QuickActionDock'
import { Toaster } from 'sonner'

export function PortalLayout() {
  return (
    <div className="flex h-screen bg-[var(--page-bg)] overflow-hidden transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <PortalHeader />
        <main className="flex-1 overflow-y-auto p-6 relative" style={{
          background: `
            radial-gradient(ellipse 55% 50% at 50% -5%, rgba(141,109,209,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 30% 35% at 88% 90%, rgba(224,160,74,0.08) 0%, transparent 55%),
            var(--page-bg)
          `
        }}>
          {/* Subtle dot grid */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(116,88,189,0.10) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              maskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, black 0%, transparent 80%)',
            }}
          />
          <div className="relative z-10">
            <PageTransition />
          </div>
        </main>
      </div>
      <CommandPalette />
      <QuickActionDock />
      <Toaster
        position="top-right"
        theme="light"
        toastOptions={{
          style: {
            background: 'var(--clay-fill)',
            border: '1px solid rgba(var(--clay-edge-light-rgb),0.7)',
            color: 'var(--clay-text)',
            boxShadow: '9px 9px 18px rgba(var(--clay-edge-dark-rgb),0.3), -9px -9px 18px rgba(var(--clay-edge-light-rgb),0.85)',
          },
        }}
      />
    </div>
  )
}
