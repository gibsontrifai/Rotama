import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useConfirmAction } from '../../../shared/hooks/useConfirmAction'
import { Badge, ConfirmActionModal, FileUploadDropZone, MetricCard, Modal, SectionCard } from '../../../shared/ui'
import { useToastStore } from '../../../shared/store/useToastStore'
import { actionsQueryKeys } from '../api/actionsQueryKeys'
import { fetchActionsMock, type ActionAttachment, type ActionStatus } from '../api/actionsApi'
import {
  useAddActionAttachmentMutation,
  useRemoveActionAttachmentMutation,
  useUpdateActionProgressMutation,
} from '../api/actionsMutations'

function getPriorityTone(priority: 'Critical' | 'High' | 'Medium') {
  if (priority === 'Critical') {
    return 'rose'
  }

  if (priority === 'High') {
    return 'amber'
  }

  return 'cyan'
}

function getStatusTone(status: 'Open' | 'In Progress' | 'Blocked' | 'Done') {
  if (status === 'Open') {
    return 'rose'
  }

  if (status === 'Blocked') {
    return 'amber'
  }

  if (status === 'Done') {
    return 'emerald'
  }

  return 'cyan'
}

export function ActionDetailPage() {
  const { actionId } = useParams<{ actionId: string }>()
  const addToast = useToastStore((state) => state.addToast)
  const updateActionProgressMutation = useUpdateActionProgressMutation()
  const addActionAttachmentMutation = useAddActionAttachmentMutation()
  const removeActionAttachmentMutation = useRemoveActionAttachmentMutation()
  const { data: actions = [], isLoading, isError } = useQuery({
    queryKey: actionsQueryKeys.mock(),
    queryFn: fetchActionsMock,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  const action = useMemo(() => actions.find((item) => item.id === actionId) ?? null, [actionId, actions])
  const [nextProgress, setNextProgress] = useState('')
  const [nextStatus, setNextStatus] = useState<ActionStatus>('In Progress')
  const [nextNote, setNextNote] = useState('')
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false)
  const [selectedAttachmentFile, setSelectedAttachmentFile] = useState<File | null>(null)
  const [selectedAttachmentError, setSelectedAttachmentError] = useState('')
  const [previewAttachment, setPreviewAttachment] = useState<ActionAttachment | null>(null)
  const removeAttachmentConfirm = useConfirmAction<ActionAttachment>()

  if (!isLoading && !isError && !action) {
    return <Navigate to="/actions" replace />
  }

  const timeline = action?.updates ?? []

  const sourceRecordPath = action
    ? action.source === 'Incident'
      ? `/incidents?filter=All&iQ=${encodeURIComponent(action.sourceRef)}`
      : action.source === 'Inspection'
        ? `/inspections?area=all&sQ=${encodeURIComponent(action.sourceRef)}`
        : null
    : null

  const attachments = action?.attachments ?? []

  const submitProgressUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!action) {
      return
    }

    const parsedProgress = Number(nextProgress)
    if (!Number.isFinite(parsedProgress) || parsedProgress < 0 || parsedProgress > 100) {
      return
    }

    await updateActionProgressMutation.mutateAsync({
      actionId: action.id,
      progress: parsedProgress,
      status: nextStatus,
      note: nextNote,
    })

    addToast(`Progress ${action.id} diperbarui ke ${parsedProgress}% dengan status ${nextStatus}.`, 'emerald')
    setNextProgress('')
    setNextNote('')
  }

  const submitAttachment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!action) {
      return
    }

    if (!selectedAttachmentFile) {
      setSelectedAttachmentError('Pilih file atau foto terlebih dahulu.')
      return
    }

    const attachmentName = selectedAttachmentFile.name.trim()
    const isPhoto = selectedAttachmentFile.type.startsWith('image/')
    const attachmentKind: ActionAttachment['kind'] = isPhoto ? 'Photo' : 'Document'
    const sizeLabel =
      selectedAttachmentFile.size >= 1024 * 1024
        ? `${(selectedAttachmentFile.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(selectedAttachmentFile.size / 1024))} KB`

    const previewUrl = isPhoto
      ? await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
          reader.onerror = () => reject(new Error('Preview read failed'))
          reader.readAsDataURL(selectedAttachmentFile)
        })
      : undefined

    await addActionAttachmentMutation.mutateAsync({
      actionId: action.id,
      name: attachmentName,
      kind: attachmentKind,
      mimeType: selectedAttachmentFile.type || undefined,
      sizeLabel,
      previewUrl,
    })

    addToast(`Attachment ${attachmentName} ditambahkan ke ${action.id}.`, 'emerald')
    setSelectedAttachmentFile(null)
    setSelectedAttachmentError('')
    setAttachmentModalOpen(false)
  }

  const removeAttachment = async () => {
    if (!action || !removeAttachmentConfirm.target) {
      return
    }

    await removeActionAttachmentMutation.mutateAsync({
      actionId: action.id,
      attachmentId: removeAttachmentConfirm.target.id,
    })

    addToast(`Attachment ${removeAttachmentConfirm.target.name} dihapus dari ${action.id}.`, 'emerald')
    removeAttachmentConfirm.close()
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Action Detail</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{action?.id ?? 'Loading action...'}</h2>
          <p className="mt-1 text-slate-600">Ruang detail untuk monitoring eksekusi corrective action.</p>
        </div>
        <Link
          to="/actions"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
        >
          Back to Tracker
        </Link>
      </div>

      {isLoading ? (
        <SectionCard>
          <p className="text-sm text-slate-600">Loading action detail...</p>
        </SectionCard>
      ) : null}

      {isError ? (
        <SectionCard>
          <p className="text-sm text-rose-700">Failed to load action detail. Please refresh the page.</p>
        </SectionCard>
      ) : null}

      {action ? (
        <>
          <header className="rounded-2xl border border-emerald-200/60 bg-[linear-gradient(120deg,#ecfdf5_0%,#eff6ff_55%,#f8fafc_100%)] p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge label={action.priority} tone={getPriorityTone(action.priority)} />
                  <Badge label={action.status} tone={getStatusTone(action.status)} />
                  <Badge label={`${action.source} ${action.sourceRef}`} tone="slate" />
                  {sourceRecordPath ? (
                    <Link
                      to={sourceRecordPath}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                    >
                      Open Source Record
                    </Link>
                  ) : null}
                </div>
                <h3 className="mt-3 text-2xl font-semibold text-slate-950">{action.title}</h3>
                <p className="mt-2 text-sm text-slate-600">Area: {action.area} • Owner: {action.owner} • Due: {action.dueDate}</p>
              </div>

              <div className="w-full max-w-xs rounded-2xl border border-white/80 bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Execution Progress</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{action.progress}%</p>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#06b6d4_0%,#22c55e_100%)]" style={{ width: `${action.progress}%` }} />
                </div>
              </div>
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Priority" value={action.priority} trend={action.priority === 'Critical' ? 'down' : 'up'} />
            <MetricCard label="Status" value={action.status} trend={action.status === 'Blocked' ? 'down' : 'up'} />
            <MetricCard label="Progress" value={`${action.progress}%`} trend={action.progress >= 70 ? 'up' : 'down'} />
            <MetricCard label="Source Ref" value={action.sourceRef} trend="up" />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <SectionCard title="Execution Timeline" subtitle="Riwayat update progress dan kepemilikan action.">
              <div className="space-y-4">
                {timeline.map((item) => (
                  <div key={item.title} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mt-1 h-3 w-3 rounded-full bg-emerald-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Execution Notes" subtitle="Ringkasan konteks operasional action item.">
              <div className="space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Owner Focus</p>
                  <p className="mt-1">{action.owner} bertanggung jawab menutup gap kontrol operasional pada area {action.area}.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Risk Context</p>
                  <p className="mt-1">Action ini berasal dari {action.source.toLowerCase()} dengan referensi {action.sourceRef} dan harus selesai sebelum SLA due date tercapai.</p>
                  {sourceRecordPath ? (
                    <Link to={sourceRecordPath} className="mt-3 inline-flex text-sm font-semibold text-emerald-700 transition hover:text-emerald-800">
                      Buka record sumber
                    </Link>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">Next Review</p>
                  <p className="mt-1">Review progres berikutnya dijadwalkan pada checkpoint harian bersama owner dan HSE coordinator.</p>
                </div>

                <form onSubmit={submitProgressUpdate} className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <p className="font-semibold text-slate-900">Update Progress</p>
                  <p className="mt-1 text-sm text-slate-600">Catat progres terbaru agar tracker dan detail page langsung sinkron.</p>

                  <div className="mt-4 space-y-3">
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">Progress (%)</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={nextProgress}
                        onChange={(event) => setNextProgress(event.target.value)}
                        placeholder={`${action.progress}`}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </label>

                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">Status</span>
                      <select
                        value={nextStatus}
                        onChange={(event) => setNextStatus(event.target.value as ActionStatus)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Blocked">Blocked</option>
                        <option value="Done">Done</option>
                      </select>
                    </label>

                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">Progress Note</span>
                      <textarea
                        value={nextNote}
                        onChange={(event) => setNextNote(event.target.value)}
                        rows={3}
                        placeholder="Contoh: material sudah datang, pemasangan dimulai di shift siang."
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={updateActionProgressMutation.isPending}
                      className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updateActionProgressMutation.isPending ? 'Saving...' : 'Save Update'}
                    </button>
                  </div>
                </form>
              </div>
            </SectionCard>
          </div>

          <SectionCard
            title="Attachments"
            subtitle="Placeholder bukti foto dan dokumen tindak lanjut."
            rightSlot={
              <button
                type="button"
                onClick={() => setAttachmentModalOpen(true)}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                Add Attachment
              </button>
            }
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {attachments.map((attachment) => (
                <article key={attachment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  {attachment.kind === 'Photo' && attachment.previewUrl ? (
                    <button
                      type="button"
                      onClick={() => setPreviewAttachment(attachment)}
                      className="mb-3 block w-full overflow-hidden rounded-xl border border-slate-200 bg-white"
                    >
                      <img src={attachment.previewUrl} alt={attachment.name} className="h-36 w-full object-cover" />
                    </button>
                  ) : null}
                  <div className="flex items-center justify-between gap-2">
                    <Badge label={attachment.kind} tone={attachment.kind === 'Photo' ? 'cyan' : 'slate'} />
                    <p className="text-xs font-medium text-slate-400">{attachment.uploadedAt}</p>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900">{attachment.name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {attachment.mimeType || 'Unknown type'}
                    {attachment.sizeLabel ? ` • ${attachment.sizeLabel}` : ''}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {attachment.kind === 'Photo'
                      ? 'Preview foto tersimpan di state mock untuk simulasi upload browser.'
                      : 'Metadata file dokumen tersimpan di state mock untuk simulasi upload browser.'}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {attachment.kind === 'Photo' && attachment.previewUrl ? (
                      <button
                        type="button"
                        onClick={() => setPreviewAttachment(attachment)}
                        className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
                      >
                        Preview
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeAttachmentConfirm.open(attachment)}
                      className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}

              {attachments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                  Belum ada attachment. Tambahkan bukti foto atau dokumen tindak lanjut dari action ini.
                </div>
              ) : null}
            </div>
          </SectionCard>
        </>
      ) : null}

      <Modal
        isOpen={attachmentModalOpen}
        title="Add Attachment Placeholder"
        subtitle="Simpan metadata file sebagai persiapan integrasi upload nyata."
        onClose={() => setAttachmentModalOpen(false)}
      >
        <form onSubmit={submitAttachment} className="space-y-4">
          <FileUploadDropZone
            onFilesSelected={(files) => {
              if (files.length > 0) {
                setSelectedAttachmentFile(files[0])
                setSelectedAttachmentError('')
              }
            }}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
            disabled={addActionAttachmentMutation.isPending}
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Selected File</p>
            <p className="mt-1">{selectedAttachmentFile ? selectedAttachmentFile.name : 'Belum ada file dipilih.'}</p>
            <p>{selectedAttachmentFile ? selectedAttachmentFile.type || 'Unknown type' : 'Pilih foto atau dokumen dari perangkat Anda.'}</p>
          </div>

          {selectedAttachmentError ? <p className="text-sm font-medium text-rose-700">{selectedAttachmentError}</p> : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setAttachmentModalOpen(false)
                setSelectedAttachmentFile(null)
                setSelectedAttachmentError('')
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addActionAttachmentMutation.isPending}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addActionAttachmentMutation.isPending ? 'Saving...' : 'Save Attachment'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={previewAttachment !== null}
        title={previewAttachment?.name ?? 'Attachment Preview'}
        subtitle={previewAttachment?.sizeLabel}
        onClose={() => setPreviewAttachment(null)}
        widthClassName="max-w-4xl"
      >
        {previewAttachment?.previewUrl ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <img src={previewAttachment.previewUrl} alt={previewAttachment.name} className="max-h-[70vh] w-full object-contain" />
            </div>
            <p className="text-sm text-slate-600">{previewAttachment.mimeType || 'Unknown type'}</p>
          </div>
        ) : null}
      </Modal>

      <ConfirmActionModal
        isOpen={removeAttachmentConfirm.isOpen}
        title="Delete Attachment"
        message={
          removeAttachmentConfirm.target
            ? `Hapus attachment ${removeAttachmentConfirm.target.name} dari action ini?`
            : 'Hapus attachment ini?'
        }
        confirmLabel={removeActionAttachmentMutation.isPending ? 'Deleting...' : 'Delete'}
        isSubmitting={removeActionAttachmentMutation.isPending}
        onCancel={removeAttachmentConfirm.close}
        onConfirm={() => void removeAttachment()}
      />
    </section>
  )
}