import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createInspectionMock, type InspectionItem, type CreateInspectionPayload } from './inspectionsApi'
import { inspectionsQueryKeys } from './inspectionsQueryKeys'

export function useCreateInspectionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateInspectionPayload) => createInspectionMock(payload),
    onSuccess: (newInspection) => {
      queryClient.setQueryData<InspectionItem[]>(inspectionsQueryKeys.mock(), (previous) => [newInspection, ...(previous ?? [])])
    },
  })
}