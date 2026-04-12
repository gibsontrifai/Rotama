import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { loginApi, refreshTokenApi } from '../../features/auth/api/authApi'
import type { AuthSession, LoginPayload } from '../../features/auth/types/auth.types'

type AuthState = {
  session: AuthSession | null
  hasHydrated: boolean
  login: (payload: LoginPayload) => Promise<void>
  refreshAccessToken: () => Promise<boolean>
  setHydrated: (value: boolean) => void
  updateProfile: (updates: Partial<Pick<AuthSession, 'fullName' | 'position' | 'branch' | 'expertise' | 'avatar'>>, callback?: () => void) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      hasHydrated: false,
      login: async (payload) => {
        const session = await loginApi(payload)
        set({ session })
      },
      refreshAccessToken: async () => {
        const currentSession = get().session
        if (!currentSession) {
          return false
        }

        try {
          const tokenData = await refreshTokenApi(currentSession.refreshToken)
          set({
            session: {
              ...currentSession,
              accessToken: tokenData.accessToken,
              refreshToken: tokenData.refreshToken,
              expiresAt: tokenData.expiresAt,
            },
          })

          return true
        } catch {
          set({ session: null })
          return false
        }
      },
      setHydrated: (value) => {
        set({ hasHydrated: value })
      },
      updateProfile: (updates, callback) => {
        const newSession = {
          ...get().session,
          ...updates,
        } as AuthSession | null

        set({ session: newSession }, false)

        // Use microtask to ensure state is synced before callback
        queueMicrotask(() => {
          if (callback) callback()
        })
      },
      logout: () => {
        set({ session: null })
      },
    }),
    {
      name: 'safetyhub-auth',
      partialize: (state) => ({
        session: state.session,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
      version: 1,
    }
  )
)
