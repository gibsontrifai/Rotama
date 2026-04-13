import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet'
import { useAuthStore } from '../../../shared/store/useAuthStore'
import { Badge, Modal, SectionCard } from '../../../shared/ui'
import { useToastStore } from '../../../shared/store/useToastStore'
import { ROLE_LABEL } from '../../../app/rbac'
import { updateProfileApi } from '../api/usersApi'

type BranchMapConfig = {
  title: string
  subtitle: string
  lat: number
  lon: number
}

function getBranchMapConfig(branchValue: string): BranchMapConfig {
  const normalized = branchValue.toLowerCase()

  if (normalized.includes('jakarta')) {
    return {
      title: 'Head Office - Jakarta',
      subtitle: 'Lokasi kantor pusat operasional.',
      lat: -6.2088,
      lon: 106.8456,
    }
  }

  if (normalized.includes('bandung')) {
    return {
      title: 'Bandung Plant',
      subtitle: 'Lokasi fasilitas cabang Bandung.',
      lat: -6.9175,
      lon: 107.6191,
    }
  }

  if (normalized.includes('surabaya')) {
    return {
      title: 'Surabaya Plant',
      subtitle: 'Lokasi fasilitas cabang Surabaya.',
      lat: -7.2575,
      lon: 112.7521,
    }
  }

  return {
    title: branchValue || 'Main Office',
    subtitle: 'Lokasi default profil pengguna.',
    lat: -6.2,
    lon: 106.816666,
  }
}

export function ProfilePage() {
  const sessionId = useAuthStore((state) => state.session?.username)
  const fullName = useAuthStore((state) => state.session?.fullName)
  const position = useAuthStore((state) => state.session?.position)
  const branch = useAuthStore((state) => state.session?.branch)
  const expertise = useAuthStore((state) => state.session?.expertise)
  const session = useAuthStore((state) => state.session)
  const updateProfile = useAuthStore((state) => state.updateProfile)
  const addToast = useToastStore((state) => state.addToast)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    fullName: session?.fullName || '',
    position: session?.position || '',
    branch: session?.branch || '',
    expertise: (session?.expertise || []).join(', '),
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const updateProfileMutation = useMutation({
    mutationFn: updateProfileApi,
  })

  if (!session) {
    return null
  }

  const handleOpenEditModal = () => {
    setEditForm({
      fullName: session.fullName,
      position: session.position,
      branch: session.branch,
      expertise: session.expertise.join(', '),
    })
    setEditModalOpen(true)
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      addToast('Ukuran foto maksimal 5MB', 'rose')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (!file.type.startsWith('image/')) {
      addToast('Silakan upload file foto (JPG, PNG, etc)', 'rose')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string

      try {
        const result = await updateProfileMutation.mutateAsync({
          username: session.username,
          fullName: session.fullName,
          position: session.position,
          branch: session.branch,
          expertise: session.expertise,
          avatar: dataUrl,
        })

        if (result) {
          updateProfile({
            fullName: result.fullName,
            position: result.position,
            branch: result.branch,
            expertise: result.expertise,
            avatar: result.avatar,
          })
        } else {
          updateProfile({ avatar: dataUrl })
        }

        addToast('Foto profil Anda berhasil diubah')
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Gagal mengubah foto profil.', 'rose')
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsDataURL(file)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const expertiseArray = editForm.expertise
      .split(',')
      .map((exp) => exp.trim())
      .filter((exp) => exp.length > 0)

    try {
      const result = await updateProfileMutation.mutateAsync({
        username: session.username,
        fullName: editForm.fullName,
        position: editForm.position,
        branch: editForm.branch,
        expertise: expertiseArray,
        avatar: session.avatar,
      })

      if (result) {
        updateProfile({
          fullName: result.fullName,
          position: result.position,
          branch: result.branch,
          expertise: result.expertise,
          avatar: result.avatar,
        })
      } else {
        updateProfile({
          fullName: editForm.fullName,
          position: editForm.position,
          branch: editForm.branch,
          expertise: expertiseArray,
        })
      }

      setEditModalOpen(false)
      addToast('Data profil Anda berhasil disimpan')
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Gagal menyimpan data profil.', 'rose')
    }
  }

  const branchMap = getBranchMapConfig(branch || '')
  const openStreetMapUrl = `https://www.openstreetmap.org/?mlat=${branchMap.lat}&mlon=${branchMap.lon}#map=13/${branchMap.lat}/${branchMap.lon}`

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900">Profil Pengguna</h1>
          <p className="text-base text-slate-600">Informasi detail akun Anda</p>
        </div>
        <button
          type="button"
          onClick={handleOpenEditModal}
          className="rounded-lg border border-teal-300 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
        >
          Edit Profil
        </button>
      </div>

      <SectionCard title="Informasi Pribadi" subtitle="Data lengkap profil pengguna">
        <div className="space-y-6">
          <div className="flex items-start gap-6">
            <div className="relative">
              {session.avatar ? (
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-slate-200">
                  <img src={session.avatar} alt={session.fullName} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-full border-4 border-slate-200 bg-gradient-to-br from-teal-400 to-cyan-500 p-1 text-white">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-2xl font-bold">
                    {session.fullName
                      .split(' ')
                      .map((name) => name[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Ganti foto"
                className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-teal-500 p-2 text-white transition hover:bg-teal-600"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>

            <div className="flex-1 space-y-1">
              <h2 className="text-2xl font-bold text-slate-900">{fullName}</h2>
              <p className="text-sm text-slate-600">@{sessionId}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge label={position || 'Employee'} tone="cyan" />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200" />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nama Lengkap
              </label>
              <p className="text-sm font-medium text-slate-900">{fullName}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Username
              </label>
              <p className="text-sm font-medium text-slate-900">{sessionId}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Jabatan
              </label>
              <p className="text-sm font-medium text-slate-900">{position}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cabang
              </label>
              <p className="text-sm font-medium text-slate-900">{branch}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Role Akses
              </label>
              <p className="text-sm font-medium text-slate-900">{ROLE_LABEL[session.role]}</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Lokasi Cabang" subtitle="Peta lokasi berdasarkan cabang profil pengguna.">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{branchMap.title}</p>
              <p className="text-xs text-slate-600">{branchMap.subtitle}</p>
            </div>
            <a
              href={openStreetMapUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100"
            >
              Buka Map
            </a>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <MapContainer
              center={[branchMap.lat, branchMap.lon]}
              zoom={13}
              scrollWheelZoom={false}
              className="h-72 w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <CircleMarker
                center={[branchMap.lat, branchMap.lon]}
                radius={9}
                pathOptions={{ color: '#0f766e', fillColor: '#14b8a6', fillOpacity: 0.85 }}
              >
                <Tooltip direction="top" offset={[0, -2]} opacity={1} permanent>
                  {branchMap.title}
                </Tooltip>
              </CircleMarker>
            </MapContainer>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Keahlian" subtitle="Area keahlian dan spesialisasi">
        <div className="space-y-4">
          {expertise && expertise.length > 0 ? (
            <>
              <p className="text-sm text-slate-600">
                Anda memiliki {expertise.length} area keahlian yang terdaftar.
              </p>
              <div className="flex flex-wrap gap-2">
                {expertise.map((exp) => (
                  <Badge key={exp} label={exp} tone="emerald" />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-600">
              <p>Belum ada keahlian yang terdaftar</p>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Informasi Akun" subtitle="Status dan pengaturan akun">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Status Akun</p>
              <p className="mt-0.5 text-xs text-slate-600">Akun aktif dan terverifikasi</p>
            </div>
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Akses Sistem</p>
              <p className="mt-0.5 text-xs text-slate-600">Akses penuh ke semua fitur</p>
            </div>
            <Badge label="Full Access" tone="cyan" />
          </div>
        </div>
      </SectionCard>

      <Modal
        isOpen={editModalOpen}
        title="Edit Profil"
        subtitle="Perbarui informasi profil Anda"
        onClose={() => setEditModalOpen(false)}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Nama Lengkap</label>
            <input
              type="text"
              value={editForm.fullName}
              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Jabatan</label>
            <input
              type="text"
              value={editForm.position}
              onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Cabang</label>
            <input
              type="text"
              value={editForm.branch}
              onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Keahlian</label>
            <textarea
              value={editForm.expertise}
              onChange={(e) => setEditForm({ ...editForm, expertise: e.target.value })}
              placeholder="Pisahkan dengan koma. Contoh: Risk Assessment, Safety Policy, Incident Investigation"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              rows={3}
            />
            <p className="text-xs text-slate-500">Pisahkan setiap keahlian dengan koma</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-lg border border-teal-300 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </Modal>
    </section>
  )
}
