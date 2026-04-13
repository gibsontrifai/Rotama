import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { UserManagementPage } from './UserManagementPage'

vi.mock('../api/usersApi', () => ({
  fetchUsers: vi.fn(async () => [
    {
      id: 1,
      username: 'admin',
      fullName: 'Budi Santoso',
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
      username: 'supervisor',
      fullName: 'Siti Nurhaliza',
      role: 'supervisor',
      branch: 'Bandung Plant',
      position: 'Health & Safety Supervisor',
      email: 'supervisor@safetyhub.local',
      phone: '082222222222',
      isActive: true,
      expertise: ['Workplace Inspection'],
    },
  ]),
  createUserApi: vi.fn(),
  updateUserStatusApi: vi.fn(),
  deleteUserApi: vi.fn(),
}))

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <UserManagementPage />
    </QueryClientProvider>
  )
}

describe('UserManagementPage', () => {
  it('disables status and delete actions for primary admin account', async () => {
    renderPage()

    const usernameCell = await screen.findByText('admin')
    const adminRow = usernameCell.closest('tr')

    expect(adminRow).not.toBeNull()

    const scoped = within(adminRow as HTMLTableRowElement)

    expect(scoped.getByRole('button', { name: 'Terkunci' })).toBeDisabled()
    expect(scoped.getByRole('button', { name: 'Hapus' })).toBeDisabled()
  })

  it('keeps status and delete actions enabled for non-admin account', async () => {
    renderPage()

    const usernameCell = await screen.findByText('supervisor')
    const supervisorRow = usernameCell.closest('tr')

    expect(supervisorRow).not.toBeNull()

    const scoped = within(supervisorRow as HTMLTableRowElement)

    expect(scoped.getByRole('button', { name: 'Nonaktifkan' })).toBeEnabled()
    expect(scoped.getByRole('button', { name: 'Hapus' })).toBeEnabled()
  })
})
