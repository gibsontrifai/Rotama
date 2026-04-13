import { useAuthStore } from '../../../shared/store/useAuthStore'
import type { UserRole } from '../../auth/types/auth.types'

export type NotificationSource = 'Cabang' | 'Pusat'

export type NotificationItem = {
  id: string
  source: NotificationSource
  sender: string
  message: string
  time: string
  unread: boolean
  targetRoles: UserRole[]
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const USE_MOCK_NOTIFICATIONS = import.meta.env.VITE_USE_MOCK_NOTIFICATIONS === 'true'
const isNotificationsBackendEnabled = !USE_MOCK_NOTIFICATIONS && API_BASE_URL.length > 0

const mockNotifications: NotificationItem[] = [
  {
    id: 'ntf-01',
    source: 'Cabang',
    sender: 'Bandung Plant',
    message: 'Data inspeksi shift pagi sudah dikirim dan menunggu review pusat.',
    time: '10 menit lalu',
    unread: true,
    targetRoles: ['supervisor', 'administrator'],
  },
  {
    id: 'ntf-02',
    source: 'Pusat',
    sender: 'Head Office K3',
    message: 'Mohon update progres CAPA untuk incident dengan prioritas tinggi hari ini.',
    time: '32 menit lalu',
    unread: true,
    targetRoles: ['technician', 'supervisor', 'administrator'],
  },
]

async function parseErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { message?: string; error?: { message?: string } }
    return data.error?.message || data.message || 'Permintaan notifikasi gagal diproses.'
  } catch {
    return 'Permintaan notifikasi gagal diproses.'
  }
}

async function notificationsRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

export async function fetchNotifications(): Promise<NotificationItem[]> {
  if (isNotificationsBackendEnabled) {
    const data = await notificationsRequest<
      Array<{ id: string; source: NotificationSource; sender: string; message: string; timeLabel: string; unread: boolean }>
    >('/notifications')

    return data.map((item) => ({
      id: item.id,
      source: item.source,
      sender: item.sender,
      message: item.message,
      time: item.timeLabel,
      unread: item.unread,
      targetRoles: ['technician', 'supervisor', 'administrator'],
    }))
  }

  await new Promise((resolve) => setTimeout(resolve, 200))
  return mockNotifications
}

export async function markNotificationAsRead(notificationId: string): Promise<NotificationItem[]> {
  if (isNotificationsBackendEnabled) {
    const data = await notificationsRequest<
      Array<{ id: string; source: NotificationSource; sender: string; message: string; timeLabel: string; unread: boolean }>
    >(`/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: 'PATCH',
    })

    return data.map((item) => ({
      id: item.id,
      source: item.source,
      sender: item.sender,
      message: item.message,
      time: item.timeLabel,
      unread: item.unread,
      targetRoles: ['technician', 'supervisor', 'administrator'],
    }))
  }

  await new Promise((resolve) => setTimeout(resolve, 150))
  return mockNotifications.map((item) => (item.id === notificationId ? { ...item, unread: false } : item))
}
