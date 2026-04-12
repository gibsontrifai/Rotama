import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ActionAttachment, ActionItem, ActionStatus, ActionUpdate } from './actionsApi'
import { actionsQueryKeys } from './actionsQueryKeys'

type AssignOwnerPayload = {
  actionId: string
  owner: string
}

type UpdateActionStatusPayload = {
  actionId: string
  status: ActionStatus
}

type UpdateActionProgressPayload = {
  actionId: string
  progress: number
  status: ActionStatus
  note: string
}

type AddActionAttachmentPayload = {
  actionId: string
  name: string
  kind: ActionAttachment['kind']
  mimeType?: string
  sizeLabel?: string
  previewUrl?: string
}

type RemoveActionAttachmentPayload = {
  actionId: string
  attachmentId: string
}

type CreateActionPayload = {
  title: string
  area: string
  source: ActionItem['source']
  sourceRef: string
  priority: ActionItem['priority']
  owner: string
  dueDate: string
}

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
    mutationFn: assignActionOwnerMock,
    onSuccess: ({ actionId, owner }) => {
      queryClient.setQueryData<ActionItem[]>(actionsQueryKeys.mock(), (previous) =>
        (previous ?? []).map((action) => (action.id === actionId ? { ...action, owner } : action)),
      )
    },
  })
}

export function useUpdateActionStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateActionStatusMock,
    onSuccess: ({ actionId, status }) => {
      queryClient.setQueryData<ActionItem[]>(actionsQueryKeys.mock(), (previous) =>
        (previous ?? []).map((action) =>
          action.id === actionId
            ? { ...action, status, progress: getProgressByStatus(status, action.progress) }
            : action,
        ),
      )
    },
  })
}

export function useUpdateActionProgressMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateActionProgressMock,
    onSuccess: ({ actionId, progress, status, note }) => {
      queryClient.setQueryData<ActionItem[]>(actionsQueryKeys.mock(), (previous) =>
        (previous ?? []).map((action) =>
          action.id === actionId
            ? {
                ...action,
                progress,
                status,
                updates: [buildProgressUpdate(progress, status, note), ...action.updates],
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
    mutationFn: addActionAttachmentMock,
    onSuccess: ({ actionId, name, kind, mimeType, sizeLabel, previewUrl }) => {
      queryClient.setQueryData<ActionItem[]>(actionsQueryKeys.mock(), (previous) =>
        (previous ?? []).map((action) =>
          action.id === actionId
            ? {
                ...action,
                attachments: [buildAttachment(name, kind, mimeType, sizeLabel, previewUrl), ...action.attachments],
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
    mutationFn: removeActionAttachmentMock,
    onSuccess: ({ actionId, attachmentId }) => {
      queryClient.setQueryData<ActionItem[]>(actionsQueryKeys.mock(), (previous) =>
        (previous ?? []).map((action) =>
          action.id === actionId
            ? {
                ...action,
                attachments: action.attachments.filter((attachment) => attachment.id !== attachmentId),
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
    mutationFn: createActionMock,
    onSuccess: ({ title, area, source, sourceRef, priority, owner, dueDate }) => {
      queryClient.setQueryData<ActionItem[]>(actionsQueryKeys.mock(), (previous) => {
        const current = previous ?? []

        return [
          {
            id: buildActionId(current),
            title,
            area,
            source,
            sourceRef,
            priority,
            status: 'Open',
            owner,
            dueDate,
            progress: 0,
            updates: [
              {
                title: 'Action created',
                detail: `${source} ${sourceRef} membuat CAPA baru untuk area ${area}.`,
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