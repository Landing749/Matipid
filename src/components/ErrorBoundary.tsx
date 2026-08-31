import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches render errors anywhere below it so one broken page doesn't take
 * down the whole app with a blank white screen. React error boundaries have
 * no hook equivalent, so this stays a class component.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error caught by ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--page-bg)' }}>
          <div className="clay-panel rounded-3xl p-8 max-w-sm w-full text-center">
            <div className="icon-tile bg-red-100 text-red-600 mx-auto mb-4">
              <AlertTriangle size={18} />
            </div>
            <h1 className="text-lg font-bold text-surface-100 mb-1.5">Something went wrong</h1>
            <p className="text-surface-500 text-sm mb-6">
              This page hit an unexpected error. Reloading usually fixes it — your data is safe.
            </p>
            <button onClick={() => window.location.reload()} className="btn-primary w-full justify-center gap-1.5">
              <RotateCcw size={14} />
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
