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
}

const mockInspections: InspectionItem[] = [
  { id: 'INSP-1421', area: 'Warehouse A', inspector: 'Rizky', score: 86, status: 'Open Action' },
  { id: 'INSP-1420', area: 'Boiler Room', inspector: 'Dina', score: 91, status: 'Closed' },
  { id: 'INSP-1419', area: 'Packing Station', inspector: 'Ardi', score: 78, status: 'Open Action' },
]

let nextInspectionNumber = 1422

export async function fetchInspectionsMock(): Promise<InspectionItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return mockInspections
}

export async function createInspectionMock(payload: CreateInspectionPayload): Promise<InspectionItem> {
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