import { useAuthStore } from '../../../shared/store/useAuthStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export type DashboardSummary = {
  kpis: {
    openFindings: number
    criticalRisk: number
    inspectionsThisWeek: number
    nearMissReports: number
  }
  capaSummary: {
    overdueCount: number
    dueTodayCount: number
    dueSoonCount: number
    blockedCount: number
    spotlightItems: Array<{
      id: string
      title: string
      area: string
      priority: 'Critical' | 'High' | 'Medium'
      status: 'Open' | 'In Progress' | 'Blocked' | 'Done'
      owner: string
      dueDate: string
      progress: number
      source: 'Incident' | 'Inspection' | 'Audit'
      sourceRef: string
    }>
  }
  sourceMix: Array<{
    source: 'Incident' | 'Inspection' | 'Audit'
    total: number
    active: number
    overdue: number
    averageProgress: number
  }>
  shiftPerformance: Array<{
    shift: string
    area: string
    completion: number
    incidents: number
  }>
  upcomingInspections: Array<{
    code: string
    time: string
    area: string
    pic: string
    status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled'
  }>
}

async function parseErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { message?: string; error?: { message?: string } }
    return data.error?.message || data.message || 'Gagal mengambil data dashboard'
  } catch {
    return 'Gagal mengambil data dashboard'
  }
}

async function dashboardRequest<T>(path: string): Promise<T> {
  const token = useAuthStore.getState().session?.accessToken

  if (!token) {
    throw new Error('Sesi tidak ditemukan. Silakan login ulang.')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  return (await response.json()) as T
}

export async function fetchDashboardSummaryApi(snapshotLabel = 'seed-2026-04', spotlightLimit = 4): Promise<DashboardSummary> {
  return dashboardRequest<DashboardSummary>(
    `/dashboard/summary?snapshotLabel=${encodeURIComponent(snapshotLabel)}&spotlightLimit=${spotlightLimit}`,
  )
}
