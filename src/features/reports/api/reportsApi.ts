import { useAuthStore } from '../../../shared/store/useAuthStore'

export type TrendPeriod = '30d' | '90d' | 'ytd'
export type FocusMetric = 'TRIR' | 'Near Miss' | 'CAPA'
export type ExportTarget = 'pdf' | 'excel'

export type AreaSafetyRow = {
  area: string
  inspections: number
  incidents: number
  compliance: number
  trir: number
  nearMiss: number
  capa: number
}

export type ReportsDataset = {
  areaSafetyRows: AreaSafetyRow[]
  trendByAreaAndPeriod: Record<string, Record<TrendPeriod, number[]>>
  allFocusMetrics: FocusMetric[]
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const USE_MOCK_REPORTS = import.meta.env.VITE_USE_MOCK_REPORTS === 'true'
const isReportsBackendEnabled = !USE_MOCK_REPORTS && API_BASE_URL.length > 0

const areaSafetyRows: AreaSafetyRow[] = [
  { area: 'Warehouse', inspections: 38, incidents: 5, compliance: 87, trir: 2.1, nearMiss: 7, capa: 11 },
  { area: 'Production', inspections: 52, incidents: 4, compliance: 91, trir: 1.7, nearMiss: 6, capa: 14 },
  { area: 'Utilities', inspections: 21, incidents: 2, compliance: 90, trir: 1.4, nearMiss: 3, capa: 8 },
  { area: 'Loading Bay', inspections: 17, incidents: 1, compliance: 93, trir: 1.1, nearMiss: 2, capa: 6 },
]

const trendByAreaAndPeriod: Record<string, Record<TrendPeriod, number[]>> = {
  'All Areas': {
    '30d': [18, 14, 16, 11, 9, 7],
    '90d': [22, 21, 19, 16, 14, 11],
    ytd: [27, 25, 23, 20, 18, 15],
  },
  Warehouse: {
    '30d': [7, 6, 6, 5, 4, 3],
    '90d': [8, 8, 7, 6, 5, 4],
    ytd: [9, 9, 8, 7, 6, 5],
  },
  Production: {
    '30d': [8, 6, 7, 5, 4, 3],
    '90d': [10, 9, 8, 7, 6, 5],
    ytd: [12, 11, 10, 8, 7, 6],
  },
  Utilities: {
    '30d': [3, 2, 2, 1, 1, 1],
    '90d': [4, 3, 3, 2, 2, 1],
    ytd: [5, 4, 4, 3, 2, 2],
  },
  'Loading Bay': {
    '30d': [2, 2, 1, 1, 1, 0],
    '90d': [3, 2, 2, 1, 1, 1],
    ytd: [4, 3, 2, 2, 1, 1],
  },
}

const allFocusMetrics: FocusMetric[] = ['TRIR', 'Near Miss', 'CAPA']

async function parseErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { message?: string; error?: { message?: string } }
    return data.error?.message || data.message || 'Permintaan reports gagal diproses.'
  } catch {
    return 'Permintaan reports gagal diproses.'
  }
}

async function reportsRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

export async function fetchReportsDatasetMock(): Promise<ReportsDataset> {
  if (isReportsBackendEnabled) {
    return reportsRequest<ReportsDataset>('/reports/dataset')
  }

  await new Promise((resolve) => setTimeout(resolve, 250))
  return {
    areaSafetyRows,
    trendByAreaAndPeriod,
    allFocusMetrics,
  }
}

export async function exportReportMock(target: ExportTarget): Promise<ExportTarget> {
  if (isReportsBackendEnabled) {
    const response = await reportsRequest<{ target: ExportTarget }>('/reports/export', {
      method: 'POST',
      body: JSON.stringify({ target }),
    })

    return response.target
  }

  await new Promise((resolve) => setTimeout(resolve, 500))
  return target
}

export async function updateFocusMetricsMock(metrics: FocusMetric[]): Promise<ReportsDataset> {
  if (isReportsBackendEnabled) {
    return reportsRequest<ReportsDataset>('/reports/focus-metrics', {
      method: 'POST',
      body: JSON.stringify({ metrics }),
    })
  }

  await new Promise((resolve) => setTimeout(resolve, 300))

  return {
    areaSafetyRows,
    trendByAreaAndPeriod,
    allFocusMetrics: metrics,
  }
}