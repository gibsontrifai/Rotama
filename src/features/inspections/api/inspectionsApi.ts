import { useAuthStore } from '../../../shared/store/useAuthStore'

export type InspectionItem = {
  id: string
  area: string
  inspector: string
  score: number
  status: 'Open Action' | 'Closed'
}

export type CreateInspectionPayload = {
  area: string
  inspector: string
  score: number
  checklistCategories?: string[]
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const USE_MOCK_INSPECTIONS = import.meta.env.VITE_USE_MOCK_INSPECTIONS === 'true'

const mockInspections: InspectionItem[] = [
  { id: 'INSP-1421', area: 'Warehouse A', inspector: 'Rizky', score: 86, status: 'Open Action' },
  { id: 'INSP-1420', area: 'Boiler Room', inspector: 'Dina', score: 91, status: 'Closed' },
  { id: 'INSP-1419', area: 'Packing Station', inspector: 'Ardi', score: 78, status: 'Open Action' },
]

let nextInspectionNumber = 1422

async function parseErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { message?: string; error?: { message?: string } }
    return data.error?.message || data.message || 'Permintaan inspections gagal diproses.'
  } catch {
    return 'Permintaan inspections gagal diproses.'
  }
}

async function inspectionsRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

export async function fetchInspectionsMock(): Promise<InspectionItem[]> {
  if (!USE_MOCK_INSPECTIONS && API_BASE_URL) {
    return inspectionsRequest<InspectionItem[]>('/inspections')
  }

  await new Promise((resolve) => setTimeout(resolve, 300))
  return mockInspections
}

export async function createInspectionMock(payload: CreateInspectionPayload): Promise<InspectionItem> {
  if (!USE_MOCK_INSPECTIONS && API_BASE_URL) {
    return inspectionsRequest<InspectionItem>('/inspections', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  await new Promise((resolve) => setTimeout(resolve, 350))

  const newItem: InspectionItem = {
    id: `INSP-${nextInspectionNumber}`,
    area: payload.area,
    inspector: payload.inspector,
    score: payload.score,
    status: payload.score >= 90 ? 'Closed' : 'Open Action',
  }

  nextInspectionNumber += 1
  return newItem
}