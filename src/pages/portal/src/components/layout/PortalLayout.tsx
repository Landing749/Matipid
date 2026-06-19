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
        <main className="flex-1 overflow-y-auto p-6 hero-bg">
          <PageTransition />
        </main>
      </div>
      <CommandPalette />
      <QuickActionDock />
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: 'hsl(240 5% 12%)',
            border: '1px solid hsl(240 4% 20%)',
            color: 'hsl(0 0% 90%)',
          },
        }}
      />
    </div>
  )
}
