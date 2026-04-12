import { SectionCard } from '../../../shared/ui'

const mockUsers = [
  { id: 1, name: 'Budi Santoso', username: 'admin', role: 'Administrator', branch: 'Head Office - Jakarta' },
  { id: 2, name: 'Siti Nurhaliza', username: 'supervisor', role: 'Supervisor', branch: 'Bandung Plant' },
  { id: 3, name: 'Ahmad Hidayat', username: 'teknisi', role: 'Teknisi', branch: 'Surabaya Plant' },
]

export function UserManagementPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
        <p className="text-base text-slate-600">Kelola role dan akses pengguna sistem SafetyHub.</p>
      </div>

      <SectionCard title="Daftar Pengguna" subtitle="Halaman ini hanya dapat diakses oleh Administrator.">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Cabang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockUsers.map((user) => (
                <tr key={user.id} className="text-slate-700">
                  <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                  <td className="px-4 py-3">{user.username}</td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3">{user.branch}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </section>
  )
}
