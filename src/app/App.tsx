import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppRouter } from './AppRouter'
import { useAuthStore } from '../shared/store/useAuthStore'
import { useToastStore } from '../shared/store/useToastStore'
import { ToastStack } from '../shared/ui'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  const session = useAuthStore((state) => state.session)
  const refreshAccessToken = useAuthStore((state) => state.refreshAccessToken)
  const toasts = useToastStore((state) => state.toasts)

  useEffect(() => {
    if (!session) {
      return
    }

    const isNearExpiry = session.expiresAt - Date.now() < 60_000
    if (isNearExpiry) {
      void refreshAccessToken()
    }

    const intervalId = window.setInterval(() => {
      const shouldRefresh = session.expiresAt - Date.now() < 60_000
      if (shouldRefresh) {
        void refreshAccessToken()
      }
    }, 30_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [refreshAccessToken, session])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRouter />
        <ToastStack toasts={toasts} />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
