import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../shared/store/useAuthStore'
import { ROLE_LABEL, ROLE_NAV_ITEMS } from '../rbac'
import { fetchNotifications, markNotificationAsRead } from '../../features/notifications/api/notificationsApi'

export function MainLayout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = useAuthStore((state) => state.session)
  const logout = useAuthStore((state) => state.logout)
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: fetchNotifications,
    enabled: !!session,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: (nextNotifications) => {
      queryClient.setQueryData(['notifications', 'list'], nextNotifications)
    },
  })
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }

      if (!notificationRef.current?.contains(event.target as Node)) {
        setIsNotificationOpen(false)
      }
    }

    window.addEventListener('mousedown', onPointerDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
    }
  }, [])

  const onLogout = () => {
    setIsUserMenuOpen(false)
    setIsNotificationOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const onProfileClick = () => {
    setIsUserMenuOpen(false)
    setIsNotificationOpen(false)
    navigate('/profile')
  }

  const initials = (session?.fullName || 'User')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const allowedNavItems = ROLE_NAV_ITEMS.filter((item) => {
    if (!session) {
      return false
    }

    return item.roles.includes(session.role)
  })

  const visibleNotifications = !session
    ? []
    : notifications.filter((item) => item.targetRoles.includes(session.role))

  const unreadCount = visibleNotifications.filter((item) => item.unread).length

  const markAllAsRead = async () => {
    const unreadNotificationIds = visibleNotifications.filter((item) => item.unread).map((item) => item.id)

    for (const notificationId of unreadNotificationIds) {
      // Sequential requests keep update order deterministic for dropdown rendering.
      // eslint-disable-next-line no-await-in-loop
      await markAsReadMutation.mutateAsync(notificationId)
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,#fffaf0_0%,#f0fdfa_52%,#f8fafc_100%)] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-teal-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(236,253,245,0.88)_100%)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="rounded-xl border border-teal-100 bg-white/80 px-5 py-3 shadow-sm">
            <h1 className="bg-[linear-gradient(92deg,#0f172a_0%,#0f766e_48%,#22c55e_100%)] bg-clip-text text-sm font-extrabold uppercase tracking-[0.18em] text-transparent md:text-sm">
              SAFETYHUB
            </h1>
          </div>

          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <nav className="flex gap-1 rounded-full border border-teal-100 bg-white/95 p-1.5 shadow-sm md:gap-2">
              {allowedNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'rounded-full px-3 py-2 text-sm font-medium transition-colors md:px-4',
                      isActive
                        ? 'bg-[linear-gradient(90deg,#0f766e_0%,#0891b2_100%)] text-white shadow'
                        : 'text-slate-700 hover:bg-teal-50 hover:text-teal-800',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div ref={notificationRef} className="relative">
              <button
                type="button"
                title="Notifications"
                aria-label="Open notifications"
                onClick={() => setIsNotificationOpen((open) => !open)}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-teal-200 bg-white text-slate-700 shadow-sm transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </button>

              {isNotificationOpen ? (
                <div className="panel-fade-slide absolute right-0 mt-2 w-[380px] rounded-2xl border border-teal-100 bg-white p-2 shadow-[0_16px_40px_rgba(15,118,110,0.14)]">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Notifikasi Data</p>
                        <p className="text-[11px] text-slate-500">Kiriman data dari Cabang dan Pusat</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
                          {unreadCount} unread
                        </span>
                        <button
                          type="button"
                          onClick={() => void markAllAsRead()}
                          className="rounded-md border border-teal-200 bg-white px-2 py-1 text-[11px] font-semibold text-teal-700 transition hover:bg-teal-50"
                        >
                          Mark all
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 max-h-80 space-y-2 overflow-y-auto px-1 pb-1">
                    {visibleNotifications.length > 0 ? (
                      visibleNotifications.map((item) => (
                        <article
                          key={item.id}
                          className={[
                            'rounded-xl border p-3',
                            item.unread ? 'border-teal-200 bg-teal-50/40' : 'border-slate-200 bg-white',
                          ].join(' ')}
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={[
                                  'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                  item.source === 'Cabang'
                                    ? 'bg-cyan-100 text-cyan-800'
                                    : 'bg-violet-100 text-violet-800',
                                ].join(' ')}
                              >
                                {item.source}
                              </span>
                              <p className="text-xs font-semibold text-slate-700">{item.sender}</p>
                              {item.unread ? <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> : null}
                            </div>
                            <p className="text-[11px] text-slate-500">{item.time}</p>
                          </div>
                          <p className="text-xs leading-relaxed text-slate-700">{item.message}</p>
                          {item.unread ? (
                            <div className="mt-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() => void markAsReadMutation.mutateAsync(item.id)}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                              >
                                Mark read
                              </button>
                            </div>
                          ) : null}
                        </article>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                        Tidak ada notifikasi untuk role Anda saat ini.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((open) => !open)}
                className="group flex h-11 items-center gap-2 rounded-2xl border border-teal-200/90 bg-white px-3 shadow-[0_8px_24px_rgba(15,118,110,0.08)] transition hover:border-teal-400 hover:bg-teal-50"
              >
                {session?.avatar ? (
                  <img
                    src={session.avatar}
                    alt={session.fullName || 'User avatar'}
                    className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    {initials}
                  </div>
                )}

                <svg
                  className={[
                    'h-4 w-4 text-slate-500 transition-transform',
                    isUserMenuOpen ? 'rotate-180 text-teal-700' : 'rotate-0 group-hover:text-teal-700',
                  ].join(' ')}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isUserMenuOpen ? (
                <div className="panel-fade-slide absolute right-0 mt-2 w-64 rounded-2xl border border-teal-100 bg-white p-2 shadow-[0_16px_40px_rgba(15,118,110,0.14)]">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3">
                    <div className="flex items-start gap-3">
                      {session?.avatar ? (
                        <img
                          src={session.avatar}
                          alt={session.fullName || 'User avatar'}
                          className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{session?.fullName || 'User'}</p>
                        <p className="truncate text-xs text-slate-500">@{session?.username || 'user'}</p>
                        <p className="mt-1 inline-flex rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-800">
                          {session ? ROLE_LABEL[session.role] : ''}
                        </p>
                      </div>
                    </div>
                    {session?.branch ? <p className="mt-2 text-[11px] text-slate-500">Cabang: {session.branch}</p> : null}
                  </div>

                  <div className="my-2 h-px bg-slate-200" />

                  <button
                    type="button"
                    onClick={onProfileClick}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-teal-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5.121 17.804A8 8 0 1118.88 17.8M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <div>
                      <p>Profile</p>
                      <p className="text-[11px] font-normal text-slate-500">Lihat dan edit data akun</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <div>
                      <p>Logout</p>
                      <p className="text-[11px] font-normal text-rose-500">Keluar dari sesi saat ini</p>
                    </div>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200/80 bg-white/70 py-4 text-center text-sm text-slate-600 backdrop-blur-md">
        Created By : Royal Sultan Agung
      </footer>
    </div>
  )
}
