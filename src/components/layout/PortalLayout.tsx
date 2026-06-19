import { Sidebar } from './Sidebar'
import { PortalHeader } from './PortalHeader'
import { PageTransition } from './PageTransition'
import { CommandPalette } from '@/components/CommandPalette'
import { QuickActionDock } from '@/components/QuickActionDock'
import { Toaster } from 'sonner'

export function PortalLayout() {
  return (
    <div className="flex h-screen bg-surface-950 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <PortalHeader />
        <main className="flex-1 overflow-y-auto p-6 relative" style={{
          background: `
            radial-gradient(ellipse 55% 50% at 50% -5%, rgba(124,26,255,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 30% 35% at 88% 90%, rgba(245,158,11,0.08) 0%, transparent 55%),
            #09090b
          `
        }}>
          {/* Subtle dot grid */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(124,26,255,0.08) 1px, transparent 1px)',
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
        theme="dark"
        toastOptions={{
          style: {
            background: '#18181b',
            border: '1px solid rgba(124,26,255,0.15)',
            color: '#f4f4f5',
            boxShadow: '0 8px 24px -4px rgba(0,0,0,0.5)',
          },
        }}
      />
    </div>
  )
}
