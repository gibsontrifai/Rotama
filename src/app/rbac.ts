import type { UserRole } from '../features/auth/types/auth.types'

export const ROLE_LABEL: Record<UserRole, string> = {
  technician: 'Teknisi',
  supervisor: 'Supervisor',
  administrator: 'Administrator',
}

type RoleNavItem = {
  to: string
  label: string
  roles: UserRole[]
}

export const ROLE_NAV_ITEMS: RoleNavItem[] = [
  { to: '/dashboard', label: 'Dashboard', roles: ['technician', 'supervisor', 'administrator'] },
  { to: '/inspections', label: 'Inspections', roles: ['technician', 'supervisor', 'administrator'] },
  { to: '/incidents', label: 'Incidents', roles: ['technician', 'supervisor', 'administrator'] },
  { to: '/actions', label: 'Actions', roles: ['technician', 'supervisor', 'administrator'] },
  { to: '/reports', label: 'Reports', roles: ['supervisor', 'administrator'] },
  { to: '/users-management', label: 'Users', roles: ['administrator'] },
]

export function canManageActions(role: UserRole): boolean {
  return role === 'supervisor' || role === 'administrator'
}

export function canManageIncidents(role: UserRole): boolean {
  return role === 'supervisor' || role === 'administrator'
}

export function canCreateCapa(role: UserRole): boolean {
  return role === 'supervisor' || role === 'administrator'
}

export function getDefaultRouteByRole(role: UserRole): string {
  if (role === 'technician') {
    return '/dashboard'
  }

  if (role === 'supervisor') {
    return '/dashboard'
  }

  return '/dashboard'
}
