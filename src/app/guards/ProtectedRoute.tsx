import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../shared/store/useAuthStore'
import { getDefaultRouteByRole } from '../rbac'
import type { UserRole } from '../../features/auth/types/auth.types'

type ProtectedRouteProps = {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const session = useAuthStore((state) => state.session)
  const hasHydrated = useAuthStore((state) => state.hasHydrated)
  const location = useLocation()

  if (!hasHydrated) {
    return null
  }

  const isAuthenticated = Boolean(session)

  if (!isAuthenticated) {
    const redirectTo = encodeURIComponent(location.pathname)
    return <Navigate to={`/login?redirect=${redirectTo}`} replace />
  }

  if (allowedRoles && session && !allowedRoles.includes(session.role)) {
    return <Navigate to={getDefaultRouteByRole(session.role)} replace />
  }

  return <>{children}</>
}
