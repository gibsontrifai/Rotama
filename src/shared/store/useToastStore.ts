import { create } from 'zustand'

export type ToastTone = 'emerald' | 'rose'

export type ToastItem = {
  id: number
  message: string
  tone: ToastTone
}

type ToastState = {
  nextId: number
  toasts: ToastItem[]
  addToast: (message: string, tone?: ToastTone, durationMs?: number) => void
  removeToast: (id: number) => void
  clearToasts: () => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  nextId: 1,
  toasts: [],
  addToast: (message, tone = 'emerald', durationMs = 2600) => {
    const toastId = get().nextId
    set((state) => ({
      nextId: state.nextId + 1,
      toasts: [...state.toasts, { id: toastId, message, tone }],
    }))

    window.setTimeout(() => {
      get().removeToast(toastId)
    }, durationMs)
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }))
  },
  clearToasts: () => {
    set({ toasts: [] })
  },
}))