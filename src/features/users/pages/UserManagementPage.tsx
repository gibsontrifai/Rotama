import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ConfirmActionModal, Modal, SectionCard } from '../../../shared/ui'
import { ROLE_LABEL } from '../../../app/rbac'
import { useToastStore } from '../../../shared/store/useToastStore'
import type { UserRole } from '../../auth/types/auth.types'
import {
  createUserApi,
  deleteUserApi,
  fetchUsers,
  type CreateUserPayload,
  type UserItem,
  updateUserStatusApi,
} from '../api/usersApi'

const initialForm: CreateUserPayload = {
  username: '',
  password: '',
  fullName: '',
  role: 'technician',
  position: '',
  branch: '',
  email: '',
  phone: '',
}

const PROTECTED_SYSTEM_USERNAME = 'admin'

export function UserManagementPage() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((state) => state.addToast)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [form, setForm] = useState<CreateUserPayload>(initialForm)
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: fetchUsers,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const createUserMutation = useMutation({
    mutationFn: createUserApi,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', 'list'] })
      addToast('User baru berhasil ditambahkan.', 'emerald')
      setIsCreateOpen(false)
      setForm(initialForm)
    },
    onError: (error) => {
      addToast(error instanceof Error ? error.message : 'Gagal menambahkan user.', 'rose')
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ username, isActive }: { username: string; isActive: boolean }) => updateUserStatusApi(username, isActive),
    onSuccess: (updatedUser) => {
      void queryClient.invalidateQueries({ queryKey: ['users', 'list'] })
      addToast(`Status user ${updatedUser.username} diperbarui.`, 'emerald')
    },
    onError: (error) => {
      addToast(error instanceof Error ? error.message : 'Gagal mengubah status user.', 'rose')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (username: string) => deleteUserApi(username),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', 'list'] })
      addToast('User berhasil dihapus.', 'emerald')
      setDeleteTarget(null)
    },
    onError: (error) => {
      addToast(error instanceof Error ? error.message : 'Gagal menghapus user.', 'rose')
    },
  })

  const isSubmittingCreate = createUserMutation.isPending
  const roleOptions = useMemo(
    () => Object.entries(ROLE_LABEL) as Array<[UserRole, string]>,
    []
  )

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    return users.filter((user) => {
      const matchSearch =
        normalizedSearch.length === 0 ||
        user.fullName.toLowerCase().includes(normalizedSearch) ||
        user.username.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch) ||
        user.phone.toLowerCase().includes(normalizedSearch) ||
        user.branch.toLowerCase().includes(normalizedSearch)

      const matchRole = roleFilter === 'all' ? true : user.role === roleFilter
      const matchStatus =
        statusFilter === 'all' ? true : statusFilter === 'active' ? user.isActive : !user.isActive

      return matchSearch && matchRole && matchStatus
    })
  }, [users, searchQuery, roleFilter, statusFilter])

  const passwordIsStrong =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(form.password)
  const phoneIsValid = /^(\+62|62|0)\d{8,15}$/.test(form.phone.trim())
  const hasValidationInput = form.password.length > 0 || form.phone.trim().length > 0
  const createFormError = !hasValidationInput
    ? ''
    : !passwordIsStrong
      ? 'Password minimal 8 karakter dan wajib kombinasi huruf besar, huruf kecil, angka, dan simbol.'
      : !phoneIsValid
        ? 'Nomor telepon tidak valid. Gunakan format 08..., 62..., atau +62...'
        : ''

  const handleCreateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (createFormError) {
      addToast(createFormError, 'rose')
      return
    }

    createUserMutation.mutate(form)
  }

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
        <p className="text-base text-slate-600">Kelola role dan akses pengguna sistem SafetyHub.</p>
      </div>

      <SectionCard title="Daftar Pengguna" subtitle="Halaman ini hanya dapat diakses oleh Administrator.">
        {isLoading ? <p className="px-4 py-3 text-sm text-slate-600">Loading users...</p> : null}
        {isError ? <p className="px-4 py-3 text-sm text-rose-700">Gagal mengambil data user.</p> : null}

        <div className="flex flex-col gap-3 px-4 pb-3 md:flex-row md:items-end">
          <div className="grid grid-cols-1 gap-3 md:flex-1 md:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">
              Search
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari nama, username, email, telepon, cabang"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Filter Role
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as 'all' | UserRole)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">Semua Role</option>
                {roleOptions.map(([roleValue, roleLabel]) => (
                  <option key={roleValue} value={roleValue}>
                    {roleLabel}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Filter Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </label>
          </div>

          <div className="relative group self-end">
            <span className="pointer-events-none absolute -top-8 right-0 z-10 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
              Tambah User
            </span>
            <button
              type="button"
              aria-label="Tambah User"
              title="Tambah User"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-600 bg-emerald-600 text-white transition hover:bg-emerald-700"
            >
              <span className="sr-only">Tambah User</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">No. Telepon</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Cabang</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const isProtectedUser = user.username.toLowerCase() === PROTECTED_SYSTEM_USERNAME

                return (
                  <tr key={user.id} className="text-slate-700">
                    <td className="px-4 py-3 font-medium text-slate-900">{user.fullName}</td>
                    <td className="px-4 py-3">{user.username}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">{user.phone}</td>
                    <td className="px-4 py-3">{ROLE_LABEL[user.role]}</td>
                    <td className="px-4 py-3">{user.branch}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {user.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {(() => {
                          const statusLabel = isProtectedUser ? 'Terkunci' : user.isActive ? 'Nonaktifkan' : 'Aktifkan'

                          return (
                            <div className="relative group">
                              <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                                {statusLabel}
                              </span>
                              <button
                                type="button"
                                aria-label={statusLabel}
                                title={statusLabel}
                                disabled={statusMutation.isPending || isProtectedUser}
                                onClick={() => statusMutation.mutate({ username: user.username, isActive: !user.isActive })}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <span className="sr-only">{statusLabel}</span>
                                {isProtectedUser ? (
                                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M7 10V7a5 5 0 0 1 10 0v3" />
                                    <rect x="5" y="10" width="14" height="10" rx="2" />
                                  </svg>
                                ) : (
                                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2v10" />
                                    <path d="M7.5 5.5a8 8 0 1 0 9 0" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          )
                        })()}
                        <div className="relative group">
                          <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                            Hapus
                          </span>
                          <button
                            type="button"
                            aria-label="Hapus"
                            title="Hapus"
                            disabled={deleteMutation.isPending || isProtectedUser}
                            onClick={() => setDeleteTarget(user)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-300 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <span className="sr-only">Hapus</span>
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M6 6l1 14h10l1-14" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredUsers.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-5 text-center text-sm text-slate-500">
                    Tidak ada data user yang sesuai filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          if (!isSubmittingCreate) {
            setIsCreateOpen(false)
          }
        }}
        title="Tambah User"
        subtitle="Lengkapi data user baru lalu simpan."
        widthClassName="max-w-2xl"
      >
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleCreateSubmit}>
          <label className="text-sm font-medium text-slate-700">
            Nama Lengkap
            <input
              required
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Username
            <input
              required
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Role
            <select
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as UserRole }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {roleOptions.map(([roleValue, roleLabel]) => (
                <option key={roleValue} value={roleValue}>
                  {roleLabel}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Posisi
            <input
              required
              value={form.position}
              onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Cabang
            <input
              required
              value={form.branch}
              onChange={(event) => setForm((prev) => ({ ...prev, branch: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Nomor Telepon
            <input
              required
              placeholder="08..., 62..., atau +62..."
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          {createFormError ? (
            <p className="col-span-1 text-xs text-rose-700 md:col-span-2">{createFormError}</p>
          ) : null}

          <div className="col-span-1 flex justify-end gap-2 md:col-span-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmittingCreate}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmittingCreate || createFormError.length > 0}
              className="rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmittingCreate ? 'Menyimpan...' : 'Simpan User'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmActionModal
        isOpen={deleteTarget !== null}
        title="Hapus User"
        message={
          deleteTarget
            ? `Apakah Anda yakin ingin menghapus user ${deleteTarget.username}? Tindakan ini tidak dapat dibatalkan.`
            : 'Apakah Anda yakin ingin menghapus user ini?'
        }
        confirmLabel="Hapus"
        cancelLabel="Batal"
        isSubmitting={deleteMutation.isPending}
        onCancel={() => {
          if (!deleteMutation.isPending) {
            setDeleteTarget(null)
          }
        }}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.username)
          }
        }}
      />
    </section>
  )
}
