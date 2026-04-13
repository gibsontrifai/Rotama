import type { AuthSession, LoginPayload } from '../types/auth.types'

const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH !== 'false'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const MOCK_ACCESS_EXPIRES_IN_MS = 15 * 60 * 1000

const MOCK_USERS: Record<string, Omit<AuthSession, 'accessToken' | 'refreshToken' | 'expiresAt'>> = {
  admin: {
    username: 'admin',
    role: 'administrator',
    fullName: 'Budi Santoso',
    position: 'Safety Manager',
    branch: 'Head Office - Jakarta',
    expertise: ['Risk Assessment', 'Safety Policy', 'Incident Investigation'],
  },
  supervisor: {
    username: 'supervisor',
    role: 'supervisor',
    fullName: 'Siti Nurhaliza',
    position: 'Health & Safety Supervisor',
    branch: 'Bandung Plant',
    expertise: ['Workplace Inspection', 'Safety Training', 'Hazard Identification'],
  },
  teknisi: {
    username: 'teknisi',
    role: 'technician',
    fullName: 'Ahmad Hidayat',
    position: 'Teknisi K3',
    branch: 'Surabaya Plant',
    expertise: ['Work Permit', 'PPE Audit', 'Safety Compliance'],
  },
  inspector: {
    username: 'inspector',
    role: 'technician',
    fullName: 'Ahmad Hidayat',
    position: 'Safety Inspector',
    branch: 'Surabaya Plant',
    expertise: ['Work Permit', 'PPE Audit', 'Safety Compliance'],
  },
}

function buildMockSession(username: string): AuthSession {
  const entropy = `${username}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const userProfile = MOCK_USERS[username] || {
    username,
    role: 'technician',
    fullName: username.charAt(0).toUpperCase() + username.slice(1),
    position: 'Employee',
    branch: 'Main Office',
    expertise: ['General Safety'],
  }

  return {
    ...userProfile,
    accessToken: `mock-access-${btoa(entropy)}`,
    refreshToken: `mock-refresh-${btoa(`${entropy}-refresh`)}`,
    expiresAt: Date.now() + MOCK_ACCESS_EXPIRES_IN_MS,
  }
}

function parseJwtExp(accessToken: string): number | null {
  const chunks = accessToken.split('.')

  if (chunks.length !== 3) {
    return null
  }

  try {
    const payload = JSON.parse(atob(chunks[1])) as { exp?: number }
    if (!payload.exp) {
      return null
    }

    return payload.exp * 1000
  } catch {
    return null
  }
}

export async function loginApi(payload: LoginPayload): Promise<AuthSession> {
  if (USE_MOCK_AUTH) {
    if (payload.password.length < 6) {
      throw new Error('Username atau password tidak valid')
    }

    return buildMockSession(payload.username)
  }

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Gagal login. Cek username/password.')
  }

  const data = (await response.json()) as {
    username: string
    role?: AuthSession['role']
    fullName?: string
    position?: string
    branch?: string
    expertise?: string[]
    avatar?: string
    accessToken: string
    refreshToken: string
    expiresAt?: number
  }

  const expiresAt = data.expiresAt || parseJwtExp(data.accessToken)
  if (!expiresAt) {
    throw new Error('Token tidak memiliki expiry yang valid')
  }

  return {
    username: data.username,
    role: data.role || 'technician',
    fullName: data.fullName || data.username,
    position: data.position || 'Employee',
    branch: data.branch || 'Main Office',
    expertise: data.expertise || [],
    avatar: data.avatar,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt,
  }
}

export async function refreshTokenApi(refreshToken: string): Promise<Pick<AuthSession, 'accessToken' | 'refreshToken' | 'expiresAt'>> {
  if (USE_MOCK_AUTH) {
    const entropy = `${refreshToken}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    return {
      accessToken: `mock-access-${btoa(entropy)}`,
      refreshToken: `mock-refresh-${btoa(`${entropy}-refresh`)}`,
      expiresAt: Date.now() + MOCK_ACCESS_EXPIRES_IN_MS,
    }
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  })

  if (!response.ok) {
    throw new Error('Session habis. Silakan login ulang.')
  }

  const data = (await response.json()) as {
    accessToken: string
    refreshToken: string
    expiresAt?: number
  }

  const expiresAt = data.expiresAt || parseJwtExp(data.accessToken)
  if (!expiresAt) {
    throw new Error('Refresh token response tidak valid')
  }

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt,
  }
}

export async function activateAccountApi(token: string): Promise<string> {
  if (token.trim().length < 20) {
    throw new Error('Token aktivasi tidak valid.')
  }

  if (USE_MOCK_AUTH) {
    return 'Akun berhasil diaktivasi. Silakan login ke aplikasi.'
  }

  const response = await fetch(`${API_BASE_URL}/users/activate?token=${encodeURIComponent(token)}`, {
    method: 'GET',
  })

  const fallbackMessage = 'Aktivasi akun gagal. Silakan hubungi administrator.'

  if (!response.ok) {
    try {
      const errorData = (await response.json()) as { message?: string; error?: { message?: string } }
      throw new Error(errorData.error?.message || errorData.message || fallbackMessage)
    } catch {
      throw new Error(fallbackMessage)
    }
  }

  const data = (await response.json()) as { message?: string }
  return data.message || 'Akun berhasil diaktivasi. Silakan login ke aplikasi.'
}
