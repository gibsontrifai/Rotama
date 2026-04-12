import { create } from 'zustand'
import type { UserRole } from '../../features/auth/types/auth.types'

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

type NotificationState = {
  notifications: NotificationItem[]
  markAsRead: (notificationId: string) => void
  markAllAsReadByRole: (role: UserRole) => void
}

const initialNotifications: NotificationItem[] = [
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
  {
    id: 'ntf-03',
    source: 'Cabang',
    sender: 'Surabaya Plant',
    message: 'Laporan closing incident IN-347 sudah dilengkapi dokumen pendukung.',
    time: '1 jam lalu',
    unread: false,
    targetRoles: ['supervisor', 'administrator'],
  },
  {
    id: 'ntf-04',
    source: 'Pusat',
    sender: 'Audit Internal',
    message: 'Template checklist audit kuartal 2 telah diperbarui.',
    time: 'Kemarin',
    unread: false,
    targetRoles: ['administrator'],
  },
  {
    id: 'ntf-05',
    source: 'Pusat',
    sender: 'Monitoring Center',
    message: 'Reminder pengisian laporan harian cabang sebelum 18:00 WIB.',
    time: 'Hari ini',
    unread: true,
    targetRoles: ['technician', 'supervisor', 'administrator'],
  },
]

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: initialNotifications,
  markAsRead: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, unread: false } : notification
      ),
    }))
  },
  markAllAsReadByRole: (role) => {
    set((state) => ({
      notifications: state.notifications.map((notification) => {
        if (!notification.targetRoles.includes(role)) {
          return notification
        }

        return { ...notification, unread: false }
      }),
    }))
  },
}))
