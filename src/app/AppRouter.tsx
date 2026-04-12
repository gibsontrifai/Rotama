import { Navigate, Route, Routes } from 'react-router-dom'
import { MainLayout } from './layout/MainLayout'
import { DashboardPage } from '../features/dashboard/pages/DashboardPage'
import { InspectionsPage } from '../features/inspections/pages/InspectionsPage'
import { IncidentsPage } from '../features/incidents/pages/IncidentsPage'
import { ActionsPage } from '../features/actions/pages/ActionsPage'
import { ActionDetailPage } from '../features/actions/pages/ActionDetailPage'
import { ReportsPage } from '../features/reports/pages/ReportsPage'
import { ProfilePage } from '../features/users/pages/ProfilePage'
import { UserManagementPage } from '../features/users/pages/UserManagementPage'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { ProtectedRoute } from './guards/ProtectedRoute'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="inspections" element={<InspectionsPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="actions" element={<ActionsPage />} />
        <Route path="actions/:actionId" element={<ActionDetailPage />} />
        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={['supervisor', 'administrator']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="users-management"
          element={
            <ProtectedRoute allowedRoles={['administrator']}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
