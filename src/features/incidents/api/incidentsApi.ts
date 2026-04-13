import { useAuthStore } from '../../../shared/store/useAuthStore'

export type IncidentItem = {
  id: string
  title: string
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  area: string
  status: 'Open' | 'Investigating' | 'Closed'
  pic: string
  reportedAt: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const USE_MOCK_INCIDENTS = import.meta.env.VITE_USE_MOCK_INCIDENTS === 'true'

const mockIncidents: IncidentItem[] = [
  {
    id: 'INC-2411',
    title: 'Forklift near miss',
    severity: 'High',
    area: 'Warehouse A',
    status: 'Investigating',
    pic: 'HSE Team',
    reportedAt: '11 Apr, 08:42',
  },
  {
    id: 'INC-2410',
    title: 'PPE violation',
    severity: 'Medium',
    area: 'Production Line 2',
    status: 'Open',
    pic: 'Supervisor Shift B',
    reportedAt: '10 Apr, 17:20',
  },
  {
    id: 'INC-2409',
    title: 'Minor slip near loading dock',
    severity: 'Low',
    area: 'Loading Bay',
    status: 'Closed',
    pic: 'Ops Admin',
    reportedAt: '10 Apr, 09:15',
  },
  {
    id: 'INC-2408',
    title: 'Chemical spill small volume',
    severity: 'Critical',
    area: 'Chemical Storage',
    status: 'Investigating',
    pic: 'Emergency Response',
    reportedAt: '09 Apr, 21:05',
  },
]

async function parseErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { message?: string; error?: { message?: string } }
    return data.error?.message || data.message || 'Permintaan incidents gagal diproses.'
  } catch {
    return 'Permintaan incidents gagal diproses.'
  }
}

async function incidentsRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

export async function fetchIncidentsMock(): Promise<IncidentItem[]> {
  if (!USE_MOCK_INCIDENTS && API_BASE_URL) {
    return incidentsRequest<IncidentItem[]>('/incidents')
  }

  await new Promise((resolve) => setTimeout(resolve, 350))
  return mockIncidents
}