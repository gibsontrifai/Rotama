import { useAuthStore } from '../../../shared/store/useAuthStore'
import type { UserRole } from '../../auth/types/auth.types'

export type UserItem = {
  id: number
  username: string
  fullName: string
  role: UserRole
  branch: string
  position: string
  email: string
  phone: string
  isActive: boolean
  expertise: string[]
  avatar?: string
}

export type CreateUserPayload = {
  username: string
  password: string
  fullName: string
  role: UserRole
  position: string
  branch: string
  email: string
  phone: string
}

export type UpdateProfilePayload = {
  username: string
  fullName: string
  position: string
  branch: string
  expertise: string[]
  avatar?: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const USE_MOCK_USERS = import.meta.env.VITE_USE_MOCK_USERS === 'true'
const isUsersBackendEnabled = !USE_MOCK_USERS && API_BASE_URL.length > 0

const mockUsers: UserItem[] = [
  {
    id: 1,
    fullName: 'Budi Santoso',
    username: 'admin',
    role: 'administrator',
    branch: 'Head Office - Jakarta',
    position: 'Safety Manager',
    email: 'admin@safetyhub.local',
    phone: '081111111111',
    isActive: true,
    expertise: ['Risk Assessment'],
  },
  {
    id: 2,
    fullName: 'Siti Nurhaliza',
    username: 'supervisor',
    role: 'supervisor',
    branch: 'Bandung Plant',
    position: 'Health & Safety Supervisor',
    email: 'supervisor@safetyhub.local',
    phone: '082222222222',
    isActive: true,
    expertise: ['Workplace Inspection'],
  },
  {
    id: 3,
    fullName: 'Ahmad Hidayat',
    username: 'teknisi',
    role: 'technician',
    branch: 'Surabaya Plant',
    position: 'Teknisi K3',
    email: 'teknisi@safetyhub.local',
    phone: '083333333333',
    isActive: true,
    expertise: ['Safety Compliance'],
  },
]

async function parseErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { message?: string; error?: { message?: string } }
    return data.error?.message || data.message || 'Permintaan users gagal diproses.'
  } catch {
    return 'Permintaan users gagal diproses.'
  }
}

async function usersRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().session?.accessToken

  if (!token) {
    throw new Error('Sesi tidak ditemukan. Silakan login ulang.')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return (await response.json()) as T
}

export async function fetchUsers(): Promise<UserItem[]> {
  if (isUsersBackendEnabled) {
    return usersRequest<UserItem[]>('/users')
  }

  await new Promise((resolve) => setTimeout(resolve, 200))
  return mockUsers
}

export async function updateProfileApi(payload: UpdateProfilePayload): Promise<UserItem | null> {
  if (isUsersBackendEnabled) {
    return usersRequest<UserItem | null>(`/users/${encodeURIComponent(payload.username)}/profile`, {
      method: 'PATCH',
      body: JSON.stringify({
        fullName: payload.fullName,
        position: payload.position,
        branch: payload.branch,
        expertise: payload.expertise,
        avatar: payload.avatar,
      }),
    })
  }

  await new Promise((resolve) => setTimeout(resolve, 200))
  return {
    id: Date.now(),
    username: payload.username,
    fullName: payload.fullName,
    role: 'technician',
    branch: payload.branch,
    position: payload.position,
    email: `${payload.username}@safetyhub.local`,
    phone: '080000000000',
    isActive: true,
    expertise: payload.expertise,
    avatar: payload.avatar,
  }
}

export async function createUserApi(payload: CreateUserPayload): Promise<UserItem> {
  if (isUsersBackendEnabled) {
    return usersRequest<UserItem>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  await new Promise((resolve) => setTimeout(resolve, 200))
  return {
    id: Date.now(),
    username: payload.username,
    fullName: payload.fullName,
    role: payload.role,
    branch: payload.branch,
    position: payload.position,
    email: payload.email,
    phone: payload.phone,
    isActive: true,
    expertise: [],
  }
}

export async function updateUserStatusApi(username: string, isActive: boolean): Promise<UserItem> {
  if (isUsersBackendEnabled) {
    return usersRequest<UserItem>(`/users/${encodeURIComponent(username)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    })
  }

  await new Promise((resolve) => setTimeout(resolve, 150))
  const existing = mockUsers.find((user) => user.username === username)
  return {
    ...(existing || mockUsers[0]),
    username,
    isActive,
  }
}

export async function deleteUserApi(username: string): Promise<{ success: boolean }> {
  if (isUsersBackendEnabled) {
    return usersRequest<{ success: boolean }>(`/users/${encodeURIComponent(username)}`, {
      method: 'DELETE',
    })
  }

  await new Promise((resolve) => setTimeout(resolve, 150))
  return { success: true }
}
