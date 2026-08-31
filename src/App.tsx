import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ConsentProvider } from '@/contexts/ConsentContext'
import { AppRouter } from '@/router'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ConsentProvider>
          <AuthProvider>
            <ErrorBoundary>
              <AppRouter />
            </ErrorBoundary>
          </AuthProvider>
        </ConsentProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
