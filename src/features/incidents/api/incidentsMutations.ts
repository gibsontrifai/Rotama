import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { IncidentItem } from './incidentsApi'
import { incidentsQueryKeys } from './incidentsQueryKeys'

type AssignPicPayload = {
  incidentId: string
  pic: string
}

type CloseIncidentPayload = {
  incidentId: string
}

async function assignIncidentPicMock(payload: AssignPicPayload): Promise<AssignPicPayload> {
  await new Promise((resolve) => setTimeout(resolve, 450))
  return payload
}

async function closeIncidentMock(payload: CloseIncidentPayload): Promise<CloseIncidentPayload> {
  await new Promise((resolve) => setTimeout(resolve, 450))
  return payload
}

export function useAssignIncidentPicMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: assignIncidentPicMock,
    onSuccess: ({ incidentId, pic }) => {
      queryClient.setQueryData<IncidentItem[]>(incidentsQueryKeys.mock(), (previous) =>
        (previous ?? []).map((incident) => (incident.id === incidentId ? { ...incident, pic } : incident)),
      )
    },
  })
}

export function useCloseIncidentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: closeIncidentMock,
    onSuccess: ({ incidentId }) => {
      queryClient.setQueryData<IncidentItem[]>(incidentsQueryKeys.mock(), (previous) =>
        (previous ?? []).map((incident) => (incident.id === incidentId ? { ...incident, status: 'Closed' } : incident)),
      )
    },
  })
}