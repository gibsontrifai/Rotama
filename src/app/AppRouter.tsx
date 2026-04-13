import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { MainLayout } from './layout/MainLayout'
import { ProtectedRoute } from './guards/ProtectedRoute'

const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const InspectionsPage = lazy(() => import('../features/inspections/pages/InspectionsPage').then((module) => ({ default: module.InspectionsPage })))
const IncidentsPage = lazy(() => import('../features/incidents/pages/IncidentsPage').then((module) => ({ default: module.IncidentsPage })))
const ActionsPage = lazy(() => import('../features/actions/pages/ActionsPage').then((module) => ({ default: module.ActionsPage })))
const ActionDetailPage = lazy(() => import('../features/actions/pages/ActionDetailPage').then((module) => ({ default: module.ActionDetailPage })))
const ReportsPage = lazy(() => import('../features/reports/pages/ReportsPage').then((module) => ({ default: module.ReportsPage })))
const ProfilePage = lazy(() => import('../features/users/pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const UserManagementPage = lazy(() => import('../features/users/pages/UserManagementPage').then((module) => ({ default: module.UserManagementPage })))
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const ActivateAccountPage = lazy(() =>
  import('../features/auth/pages/ActivateAccountPage').then((module) => ({ default: module.ActivateAccountPage })),
)

function RouteFallback() {
  return (
    <section className="flex min-h-[30vh] items-center justify-center px-6 py-16 text-sm text-slate-600">
      Loading page...
    </section>
  )
}

function RouteLoader({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RouteLoader>
            <LoginPage />
          </RouteLoader>
        }
      />

      <Route
        path="/activate"
        element={
          <RouteLoader>
            <ActivateAccountPage />
          </RouteLoader>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <RouteLoader>
              <DashboardPage />
            </RouteLoader>
          }
        />
        <Route
          path="inspections"
          element={
            <RouteLoader>
              <InspectionsPage />
            </RouteLoader>
          }
        />
        <Route
          path="incidents"
          element={
            <RouteLoader>
              <IncidentsPage />
            </RouteLoader>
          }
        />
        <Route
          path="actions"
          element={
            <RouteLoader>
              <ActionsPage />
            </RouteLoader>
          }
        />
        <Route
          path="actions/:actionId"
          element={
            <RouteLoader>
              <ActionDetailPage />
            </RouteLoader>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={['supervisor', 'administrator']}>
              <RouteLoader>
                <ReportsPage />
              </RouteLoader>
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <RouteLoader>
              <ProfilePage />
            </RouteLoader>
          }
        />
        <Route
          path="users-management"
          element={
            <ProtectedRoute allowedRoles={['administrator']}>
              <RouteLoader>
                <UserManagementPage />
              </RouteLoader>
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
