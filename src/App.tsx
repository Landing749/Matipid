import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ConsentProvider } from '@/contexts/ConsentContext'
import { AppRouter } from '@/router'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ConsentProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </ConsentProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
