export type LoginPayload = {
  username: string
  password: string
}

export type UserRole = 'technician' | 'supervisor' | 'administrator'

export type AuthSession = {
  username: string
  role: UserRole
  fullName: string
  position: string
  branch: string
  expertise: string[]
  avatar?: string
  accessToken: string
  refreshToken: string
  expiresAt: number
}
