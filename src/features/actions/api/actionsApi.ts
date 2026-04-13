import { useAuthStore } from '../../../shared/store/useAuthStore'

export type ActionStatus = 'Open' | 'In Progress' | 'Blocked' | 'Done'
export type ActionPriority = 'Critical' | 'High' | 'Medium'
export type ActionSource = 'Incident' | 'Inspection' | 'Audit'

export type ActionUpdate = {
  title: string
  detail: string
  time: string
}

export type ActionAttachment = {
  id: string
  name: string
  kind: 'Photo' | 'Document'
  uploadedAt: string
  mimeType?: string
  sizeLabel?: string
  previewUrl?: string
}

export type ActionItem = {
  id: string
  title: string
  area: string
  source: ActionSource
  sourceRef: string
  priority: ActionPriority
  status: ActionStatus
  owner: string
  dueDate: string
  progress: number
  updates: ActionUpdate[]
  attachments: ActionAttachment[]
}

export type AssignOwnerPayload = {
  actionId: string
  owner: string
}

export type UpdateActionStatusPayload = {
  actionId: string
  status: ActionStatus
}

export type UpdateActionProgressPayload = {
  actionId: string
  progress: number
  status: ActionStatus
  note: string
}

export type AddActionAttachmentPayload = {
  actionId: string
  name: string
  kind: ActionAttachment['kind']
  mimeType?: string
  sizeLabel?: string
  previewUrl?: string
}

export type RemoveActionAttachmentPayload = {
  actionId: string
  attachmentId: string
}

export type CreateActionPayload = {
  title: string
  area: string
  source: ActionItem['source']
  sourceRef: string
  priority: ActionItem['priority']
  owner: string
  dueDate: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const USE_MOCK_ACTIONS = import.meta.env.VITE_USE_MOCK_ACTIONS === 'true'

export const isActionsBackendEnabled = !USE_MOCK_ACTIONS && API_BASE_URL.length > 0

const monthMap: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

export function parseMockActionDate(value: string) {
  const match = value.match(/^(\d{1,2})\s([A-Za-z]{3}),\s(\d{2}):(\d{2})$/)

  if (!match) {
    return null
  }

  const [, dayValue, monthLabel, hourValue, minuteValue] = match
  const month = monthMap[monthLabel]

  if (month === undefined) {
    return null
  }

  return new Date(new Date().getFullYear(), month, Number(dayValue), Number(hourValue), Number(minuteValue))
}

export function getActionDueDayOffset(action: ActionItem, referenceDate = new Date()) {
  const dueAt = parseMockActionDate(action.dueDate)

  if (!dueAt) {
    return null
  }

  const referenceStart = startOfDay(referenceDate)
  const dueStart = startOfDay(dueAt)

  return Math.round((dueStart.getTime() - referenceStart.getTime()) / (1000 * 60 * 60 * 24))
}

export function isActionOverdue(action: ActionItem, referenceDate = new Date()) {
  const dayOffset = getActionDueDayOffset(action, referenceDate)
  return dayOffset !== null && dayOffset < 0
}

export function isActionDueToday(action: ActionItem, referenceDate = new Date()) {
  return getActionDueDayOffset(action, referenceDate) === 0
}

export function isActionDueSoon(action: ActionItem, referenceDate = new Date(), maxDaysAhead = 2) {
  const dayOffset = getActionDueDayOffset(action, referenceDate)
  return dayOffset !== null && dayOffset >= 1 && dayOffset <= maxDaysAhead
}

const mockActions: ActionItem[] = [
  {
    id: 'ACT-3201',
    title: 'Install anti-slip mat near loading ramp',
    area: 'Loading Bay',
    source: 'Incident',
    sourceRef: 'INC-2411',
    priority: 'Critical',
    status: 'In Progress',
    owner: 'Facility Team',
    dueDate: '12 Apr, 14:00',
    progress: 72,
    updates: [
      {
        title: 'Finding validated',
        detail: 'Incident INC-2411 diverifikasi dan CAPA dibuka untuk area Loading Bay.',
        time: '11 Apr, 08:15',
      },
      {
        title: 'Owner assigned',
        detail: 'Facility Team ditetapkan sebagai owner untuk kontrol permukaan licin di ramp.',
        time: '11 Apr, 10:10',
      },
    ],
    attachments: [
      {
        id: 'ATT-9001',
        name: 'loading-ramp-condition.jpg',
        kind: 'Photo',
        uploadedAt: '11 Apr, 10:35',
        mimeType: 'image/jpeg',
        sizeLabel: '1.8 MB',
        previewUrl:
          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="%23d1fae5"/><rect x="64" y="190" width="512" height="90" rx="18" fill="%230f766e" opacity="0.16"/><rect x="110" y="138" width="180" height="118" rx="16" fill="%23ffffff" stroke="%230f766e" stroke-width="6"/><path d="M134 228 L194 170 L246 214 L274 186 L318 228" fill="none" stroke="%230f766e" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="244" cy="170" r="18" fill="%2314b8a6"/><text x="110" y="108" font-family="Arial" font-size="26" fill="%230f172a">Ramp condition evidence</text></svg>',
      },
    ],
  },
  {
    id: 'ACT-3200',
    title: 'Re-certify forklift operators shift B',
    area: 'Warehouse A',
    source: 'Inspection',
    sourceRef: 'INSP-1421',
    priority: 'High',
    status: 'Open',
    owner: 'Ops Supervisor',
    dueDate: '13 Apr, 09:00',
    progress: 18,
    updates: [
      {
        title: 'Finding validated',
        detail: 'Inspection INSP-1421 memicu action re-certification operator forklift shift B.',
        time: '11 Apr, 07:50',
      },
    ],
    attachments: [],
  },
  {
    id: 'ACT-3199',
    title: 'Restock chemical spill response kits',
    area: 'Chemical Storage',
    source: 'Audit',
    sourceRef: 'AUD-88',
    priority: 'Critical',
    status: 'Blocked',
    owner: 'Procurement',
    dueDate: '11 Apr, 17:00',
    progress: 44,
    updates: [
      {
        title: 'Supply issue flagged',
        detail: 'Ketersediaan spill kit belum lengkap sehingga action tertahan di procurement.',
        time: '11 Apr, 09:25',
      },
    ],
    attachments: [
      {
        id: 'ATT-9002',
        name: 'spill-kit-gap-list.pdf',
        kind: 'Document',
        uploadedAt: '11 Apr, 09:40',
        mimeType: 'application/pdf',
        sizeLabel: '420 KB',
      },
    ],
  },
  {
    id: 'ACT-3198',
    title: 'Refresh PPE signage on packing station',
    area: 'Packing Station',
    source: 'Inspection',
    sourceRef: 'INSP-1419',
    priority: 'Medium',
    status: 'Done',
    owner: 'HSE Team',
    dueDate: '10 Apr, 15:30',
    progress: 100,
    updates: [
      {
        title: 'Action closed',
        detail: 'Signage PPE selesai diperbarui dan diverifikasi pada packing station.',
        time: '10 Apr, 15:30',
      },
    ],
    attachments: [
      {
        id: 'ATT-9003',
        name: 'updated-ppe-signage.jpg',
        kind: 'Photo',
        uploadedAt: '10 Apr, 15:20',
        mimeType: 'image/jpeg',
        sizeLabel: '960 KB',
        previewUrl:
          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="%23e0f2fe"/><rect x="84" y="64" width="472" height="232" rx="20" fill="%23ffffff" stroke="%230ea5e9" stroke-width="6"/><rect x="124" y="112" width="180" height="108" rx="14" fill="%23fef3c7" stroke="%23f59e0b" stroke-width="6"/><text x="150" y="176" font-family="Arial" font-size="42" font-weight="700" fill="%23b45309">PPE</text><text x="336" y="150" font-family="Arial" font-size="22" fill="%230f172a">Updated signage photo</text><text x="336" y="184" font-family="Arial" font-size="18" fill="%23475569">Packing station verification</text></svg>',
      },
    ],
  },
  {
    id: 'ACT-3197',
    title: 'Review pedestrian path marking near dock',
    area: 'Warehouse B',
    source: 'Incident',
    sourceRef: 'INC-2408',
    priority: 'High',
    status: 'In Progress',
    owner: 'Engineering',
    dueDate: '14 Apr, 11:00',
    progress: 56,
    updates: [
      {
        title: 'Execution update',
        detail: 'Penandaan ulang jalur pedestrian sedang dikerjakan bersama tim engineering.',
        time: '11 Apr, 12:10',
      },
    ],
    attachments: [],
  },
]

async function parseErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { message?: string; error?: { message?: string } }
    return data.error?.message || data.message || 'Permintaan actions gagal diproses.'
  } catch {
    return 'Permintaan actions gagal diproses.'
  }
}

async function actionsRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

export async function fetchActionsMock(): Promise<ActionItem[]> {
  if (isActionsBackendEnabled) {
    return actionsRequest<ActionItem[]>('/actions')
  }

  await new Promise((resolve) => setTimeout(resolve, 320))
  return mockActions
}

export async function assignActionOwnerApi(payload: AssignOwnerPayload): Promise<ActionItem> {
  return actionsRequest<ActionItem>(`/actions/${payload.actionId}/owner`, {
    method: 'PATCH',
    body: JSON.stringify({ owner: payload.owner }),
  })
}

export async function updateActionStatusApi(payload: UpdateActionStatusPayload): Promise<ActionItem> {
  return actionsRequest<ActionItem>(`/actions/${payload.actionId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: payload.status }),
  })
}

export async function updateActionProgressApi(payload: UpdateActionProgressPayload): Promise<ActionItem> {
  return actionsRequest<ActionItem>(`/actions/${payload.actionId}/progress`, {
    method: 'PATCH',
    body: JSON.stringify({
      progress: payload.progress,
      status: payload.status,
      note: payload.note,
    }),
  })
}

export async function addActionAttachmentApi(payload: AddActionAttachmentPayload): Promise<ActionItem> {
  return actionsRequest<ActionItem>(`/actions/${payload.actionId}/attachments`, {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      kind: payload.kind,
      mimeType: payload.mimeType,
      sizeLabel: payload.sizeLabel,
      previewUrl: payload.previewUrl,
    }),
  })
}

export async function removeActionAttachmentApi(payload: RemoveActionAttachmentPayload): Promise<ActionItem> {
  return actionsRequest<ActionItem>(`/actions/${payload.actionId}/attachments/${payload.attachmentId}`, {
    method: 'DELETE',
  })
}

export async function createActionApi(payload: CreateActionPayload): Promise<ActionItem> {
  return actionsRequest<ActionItem>('/actions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}