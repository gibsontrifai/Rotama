import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  addActionAttachmentApi,
  assignActionOwnerApi,
  createActionApi,
  isActionsBackendEnabled,
  removeActionAttachmentApi,
  updateActionProgressApi,
  updateActionStatusApi,
  type ActionAttachment,
  type ActionItem,
  type ActionStatus,
  type ActionUpdate,
  type AddActionAttachmentPayload,
  type AssignOwnerPayload,
  type CreateActionPayload,
  type RemoveActionAttachmentPayload,
  type UpdateActionProgressPayload,
  type UpdateActionStatusPayload,
} from './actionsApi'
import { actionsQueryKeys } from './actionsQueryKeys'

async function assignActionOwnerMock(payload: AssignOwnerPayload): Promise<AssignOwnerPayload> {
  await new Promise((resolve) => setTimeout(resolve, 420))
  return payload
}

async function updateActionStatusMock(payload: UpdateActionStatusPayload): Promise<UpdateActionStatusPayload> {
  await new Promise((resolve) => setTimeout(resolve, 420))
  return payload
}

async function updateActionProgressMock(payload: UpdateActionProgressPayload): Promise<UpdateActionProgressPayload> {
  await new Promise((resolve) => setTimeout(resolve, 420))
  return payload
}

async function addActionAttachmentMock(payload: AddActionAttachmentPayload): Promise<AddActionAttachmentPayload> {
  await new Promise((resolve) => setTimeout(resolve, 420))
  return payload
}

async function removeActionAttachmentMock(payload: RemoveActionAttachmentPayload): Promise<RemoveActionAttachmentPayload> {
  await new Promise((resolve) => setTimeout(resolve, 320))
  return payload
}

async function createActionMock(payload: CreateActionPayload): Promise<CreateActionPayload> {
  await new Promise((resolve) => setTimeout(resolve, 420))
  return payload
}

function buildProgressUpdate(progress: number, status: ActionStatus, note: string): ActionUpdate {
  return {
    title: 'Progress updated',
    detail: note.trim().length > 0 ? note.trim() : `Progress diperbarui ke ${progress}% dengan status ${status}.`,
    time: '11 Apr, 14:20',
  }
}

function buildAttachment(
  name: string,
  kind: ActionAttachment['kind'],
  mimeType?: string,
  sizeLabel?: string,
  previewUrl?: string,
): ActionAttachment {
  return {
    id: `ATT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    name,
    kind,
    uploadedAt: '11 Apr, 14:45',
    mimeType,
    sizeLabel,
    previewUrl,
  }
}

function buildActionId(previous: ActionItem[]) {
  const numericIds = previous
    .map((action) => Number(action.id.replace('ACT-', '')))
    .filter((value) => Number.isFinite(value))

  const nextNumber = (numericIds.length > 0 ? Math.max(...numericIds) : 3200) + 1
  return `ACT-${nextNumber}`
}

function getProgressByStatus(status: ActionStatus, previousProgress: number) {
  if (status === 'Open') {
    return Math.min(previousProgress, 20)
  }

  if (status === 'In Progress') {
    return Math.max(previousProgress, 55)
  }

  if (status === 'Blocked') {
    return Math.min(previousProgress, 65)
  }

  return 100
}

export function useAssignActionOwnerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: AssignOwnerPayload) => {
      if (isActionsBackendEnabled) {
        return assignActionOwnerApi(payload)
      }

      await assignActionOwnerMock(payload)
      return null
    },
    onSuccess: (result, variables) => {
      if (isActionsBackendEnabled && result) {
        queryClient.setQueryData<ActionItem[]>(actionsQueryKeys.mock(), (previous) =>
          (previous ?? []).map((action) => (action.id === result.id ? result : action)),
        )
        return
      }

      queryClient.setQueryData<ActionItem[]>(actionsQueryKeys.mock(), (previous) =>
        (previous ?? []).map((action) => (action.id === variables.actionId ? { ...action, owner: variables.owner } : action)),
      )
    },
  })
}

export function useUpdateActionStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateActionStatusPayload) => {
      if (isActionsBackendEnabled) {
        return updateActionStatusApi(payload)
      }

      await updateActionStatusMock(payload)
      return null
    },
    onSuccess: (result, variables) => {
      if (isActionsBackendEnabled && result) {
        queryClient.setQueryData<ActionItem[]>(actionsQueryKeys.mock(), (previous) =>
          (previous ?? []).map((action) => (action.id === result.id ? result : action)),
        )
        return
      }

      queryClient.setQueryData<ActionItem[]>(actionsQueryKeys.mock(), (previous) =>
        (previous ?? []).map((action) =>
          action.id === variables.actionId
            ? { ...action, status: variables.status, progress: getProgressByStatus(variables.status, action.progress) }
            : action,
        ),
      )
    },
  })
}

export function useUpdateActionProgressMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateActionProgressPayload) => {
      if (isActionsBackendEnabled) {
        return updateActionProgressApi(payload)
      }

      await updateActionProgressMock(payload)
      return null
    },
    onSuccess: (result, variables) => {
      if (isActionsBackendEnabled && result) {
        queryClient.setQueryData<ActionItem[]>(actionsQueryKeys.mock(), (previous) =>
          (previous ?? []).map((action) => (action.id === result.id ? result : action)),
        )
        return
      }

      queryClient.setQueryData<ActionItem[]>(actionsQueryKeys.mock(), (previous) =>
        (previous ?? []).map((action) =>
          action.id === variables.actionId
            ? {
                ...action,
                progress: variables.progress,
                status: variables.status,
                updates: [buildProgressUpdate(variables.progress, variables.status, variables.note), ...action.updates],
              }
            : action,
        ),
      )
    },
  })
}

export function useAddActionAttachmentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: AddActionAttachmentPayload) => {
      if (isActionsBackendEnabled) {
        return addActionAttachmentApi(payload)
      }

      await addActionAttachmentMock(payload)
      return null
    },
    onSuccess: (result, variables) => {
      if (isActionsBackendEnabled && result) {
        queryClient.setQueryData<ActionItem[]>(actionsQueryKeys.mock(), (previous) =>
          (previous ?? []).map((action) => (action.id === result.id ? result : action)),
        )
        return
      }

      queryClient.setQueryData<ActionItem[]>(actionsQueryKeys.mock(), (previous) =>
        (previous ?? []).map((action) =>
          action.id === variables.actionId
            ? {
                ...action,
                attachments: [
                  buildAttachment(
                    variables.name,
                    variables.kind,
                    variables.mimeType,
                    variables.sizeLabel,
                    variables.previewUrl,
                  ),
                  ...action.attachments,
                ],
              }
            : action,
        ),
      )
    },
  })
}

export function useRemoveActionAttachmentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: RemoveActionAttachmentPayload) => {
      if (isActionsBackendEnabled) {
        return removeActionAttachmentApi(payload)
      }

      await removeActionAttachmentMock(payload)
      return null
    },
    onSuccess: (result, variables) => {
      if (isActionsBackendEnabled && result) {
        queryClient.setQueryData<ActionItem[]>(actionsQueryKeys.mock(), (previous) =>
          (previous ?? []).map((action) => (action.id === result.id ? result : action)),
        )
        return
      }

      queryClient.setQueryData<ActionItem[]>(actionsQueryKeys.mock(), (previous) =>
        (previous ?? []).map((action) =>
          action.id === variables.actionId
            ? {
                ...action,
                attachments: action.attachments.filter((attachment) => attachment.id !== variables.attachmentId),
              }
            : action,
        ),
      )
    },
  })
}

export function useCreateActionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateActionPayload) => {
      if (isActionsBackendEnabled) {
        return createActionApi(payload)
      }

      await createActionMock(payload)
      return null
    },
    onSuccess: (result, variables) => {
      if (isActionsBackendEnabled && result) {
        queryClient.setQueryData<ActionItem[]>(actionsQueryKeys.mock(), (previous) => [result, ...(previous ?? [])])
        return
      }

      queryClient.setQueryData<ActionItem[]>(actionsQueryKeys.mock(), (previous) => {
        const current = previous ?? []

        return [
          {
            id: buildActionId(current),
            title: variables.title,
            area: variables.area,
            source: variables.source,
            sourceRef: variables.sourceRef,
            priority: variables.priority,
            status: 'Open',
            owner: variables.owner,
            dueDate: variables.dueDate,
            progress: 0,
            updates: [
              {
                title: 'Action created',
                detail: `${variables.source} ${variables.sourceRef} membuat CAPA baru untuk area ${variables.area}.`,
                time: '11 Apr, 15:05',
              },
            ],
            attachments: [],
          },
          ...current,
        ]
      })
    },
  })
}