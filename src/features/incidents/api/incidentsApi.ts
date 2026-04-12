export type IncidentItem = {
  id: string
  title: string
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  area: string
  status: 'Open' | 'Investigating' | 'Closed'
  pic: string
  reportedAt: string
}

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

export async function fetchIncidentsMock(): Promise<IncidentItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 350))
  return mockIncidents
}