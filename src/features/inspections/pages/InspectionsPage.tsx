import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAsyncAction } from '../../../shared/hooks/useAsyncAction'
import { useQueryParamBoolean } from '../../../shared/hooks/useQueryParamBoolean'
import { useConsumeActionParam } from '../../../shared/hooks/useConsumeActionParam'
import { useConfirmAction } from '../../../shared/hooks/useConfirmAction'
import { useQueryParamEnum } from '../../../shared/hooks/useQueryParamEnum'
import { useQueryParamNumber } from '../../../shared/hooks/useQueryParamNumber'
import { useQueryParamString } from '../../../shared/hooks/useQueryParamString'
import { useAuthStore } from '../../../shared/store/useAuthStore'
import { useToastStore } from '../../../shared/store/useToastStore'
import { Badge, ConfirmActionModal, DataTable, Modal, SectionCard } from '../../../shared/ui'
import { createTableQueryParamKeys } from '../../../shared/utils/createTableQueryParamKeys'
import { canCreateCapa } from '../../../app/rbac'
import { fetchActionsMock } from '../../actions/api/actionsApi'
import { useCreateActionMutation } from '../../actions/api/actionsMutations'
import { actionsQueryKeys } from '../../actions/api/actionsQueryKeys'
import { fetchInspectionsMock } from '../api/inspectionsApi'
import { useCreateInspectionMutation } from '../api/inspectionsMutations'
import { inspectionsQueryKeys } from '../api/inspectionsQueryKeys'

const inspectionSchema = z.object({
  area: z.string().min(2, 'Area minimal 2 karakter'),
  inspector: z.string().min(2, 'Nama inspector minimal 2 karakter'),
  score: z.coerce.number().min(1, 'Skor minimal 1').max(100, 'Skor maksimal 100'),
})

type InspectionInput = z.infer<typeof inspectionSchema>
type InspectionFormInput = z.input<typeof inspectionSchema>

const areaFilters = ['all', 'warehouse', 'production', 'utilities', 'loading-bay'] as const
type AreaFilter = (typeof areaFilters)[number]
const inspectionTableSortValues = ['id', 'area', 'inspector', 'score', 'status'] as const
type InspectionTableSortKey = (typeof inspectionTableSortValues)[number]
const tableQueryKeys = createTableQueryParamKeys('s')

export function InspectionsPage() {
  const navigate = useNavigate()
  const consumeActionParam = useConsumeActionParam()
  const role = useAuthStore((state) => state.session?.role ?? 'technician')
  const { value: activeAreaFilter, setValue: setActiveAreaFilter } = useQueryParamEnum<AreaFilter>({
    key: 'area',
    values: areaFilters,
    defaultValue: 'all',
  })
  const { value: tableSearchTerm, setValue: setTableSearchTerm } = useQueryParamString({
    key: tableQueryKeys.search,
    defaultValue: '',
  })
  const { value: tableSortKey, setValue: setTableSortKey } = useQueryParamEnum<InspectionTableSortKey>({
    key: tableQueryKeys.sort,
    values: inspectionTableSortValues,
    defaultValue: 'id',
  })
  const { value: tableSortDesc, setValue: setTableSortDesc } = useQueryParamBoolean({
    key: tableQueryKeys.desc,
    defaultValue: false,
  })
  const { value: hasRelatedCapaOnly, setValue: setHasRelatedCapaOnly } = useQueryParamBoolean({
    key: 'hasCapa',
    defaultValue: false,
  })
  const { value: tablePage, setValue: setTablePage } = useQueryParamNumber({
    key: tableQueryKeys.page,
    defaultValue: 1,
    min: 1,
  })
  const { value: tablePageSize, setValue: setTablePageSize } = useQueryParamNumber({
    key: tableQueryKeys.size,
    defaultValue: 5,
    min: 3,
    max: 20,
  })
  const addToast = useToastStore((state) => state.addToast)
  const resetConfirm = useConfirmAction<true>()
  const createInspectionMutation = useCreateInspectionMutation()
  const createActionMutation = useCreateActionMutation()
  const { data: latestInspections = [], isLoading, isError } = useQuery({
    queryKey: inspectionsQueryKeys.mock(),
    queryFn: fetchInspectionsMock,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
  const { data: relatedActions = [] } = useQuery({
    queryKey: actionsQueryKeys.mock(),
    queryFn: fetchActionsMock,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
  const [createActionTargetId, setCreateActionTargetId] = useState<string | null>(null)
  const [nextActionTitle, setNextActionTitle] = useState('')
  const [nextActionOwner, setNextActionOwner] = useState('')
  const [nextActionPriority, setNextActionPriority] = useState<'Critical' | 'High' | 'Medium'>('High')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InspectionFormInput, unknown, InspectionInput>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: {
      area: '',
      inspector: '',
      score: 80,
    },
  })

  useEffect(() => {
    const consumed = consumeActionParam('new')
    if (!consumed) {
      return
    }

    addToast('Mode New Inspection aktif. Silakan isi form inspeksi baru.', 'emerald')
  }, [addToast, consumeActionParam])

  const onSubmit = async (values: InspectionInput) => {
    await createInspectionMutation.mutateAsync({
      area: values.area,
      inspector: values.inspector,
      score: values.score,
    })
    reset()
    addToast('Inspection berhasil disimpan.', 'emerald')
  }

  const { isRunning: isResetting, run: runReset } = useAsyncAction(async () => {
    await new Promise((resolve) => setTimeout(resolve, 350))
    reset()
    resetConfirm.close()
    addToast('Form inspection berhasil di-reset.', 'emerald')
  })

  const filteredInspections = latestInspections.filter((item) => {
    const matchesArea = (() => {
      if (activeAreaFilter === 'all') {
        return true
      }

      if (activeAreaFilter === 'warehouse') {
        return item.area.toLowerCase().includes('warehouse')
      }

      if (activeAreaFilter === 'production') {
        return item.area.toLowerCase().includes('packing') || item.area.toLowerCase().includes('production')
      }

      if (activeAreaFilter === 'utilities') {
        return item.area.toLowerCase().includes('boiler') || item.area.toLowerCase().includes('utility')
      }

      return item.area.toLowerCase().includes('loading')
    })()

    if (!matchesArea) {
      return false
    }

    if (!hasRelatedCapaOnly) {
      return true
    }

    return relatedActions.some((action) => action.source === 'Inspection' && action.sourceRef === item.id)
  })

  const openActionCount = filteredInspections.filter((item) => item.status === 'Open Action').length
  const actionsByInspection = filteredInspections.map((inspection) => ({
    inspection,
    actions: relatedActions.filter((action) => action.source === 'Inspection' && action.sourceRef === inspection.id),
  }))
  const createActionTarget = latestInspections.find((inspection) => inspection.id === createActionTargetId) ?? null
  const canCreate = canCreateCapa(role)

  const getInspectionActionCount = (inspectionId: string) =>
    relatedActions.filter((action) => action.source === 'Inspection' && action.sourceRef === inspectionId).length

  const openCapaTracker = (inspectionId: string, status: 'Open Action' | 'Closed') => {
    navigate(`/actions?action=focus&aQ=${encodeURIComponent(inspectionId)}&status=${status === 'Open Action' ? 'Open' : 'Done'}`)
    addToast(`CAPA tracker dibuka untuk ${inspectionId}.`, 'emerald')
  }

  const resetTableState = () => {
    setTableSearchTerm('')
    setTableSortKey('id')
    setTableSortDesc(false)
    setTablePage(1)
    setTablePageSize(5)
  }

  const submitCreateAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!createActionTarget) {
      return
    }

    const title = nextActionTitle.trim()
    const owner = nextActionOwner.trim()
    if (title.length < 3 || owner.length < 2) {
      return
    }

    await createActionMutation.mutateAsync({
      title,
      area: createActionTarget.area,
      source: 'Inspection',
      sourceRef: createActionTarget.id,
      priority: nextActionPriority,
      owner,
      dueDate: '15 Apr, 16:00',
    })

    addToast(`CAPA baru dibuat untuk ${createActionTarget.id}.`, 'emerald')
    setCreateActionTargetId(null)
    setNextActionTitle('')
    setNextActionOwner('')
    setNextActionPriority('High')
  }

  return (
    <section className="space-y-6">
      {isLoading ? (
        <SectionCard>
          <p className="text-sm text-slate-600">Loading inspections data...</p>
        </SectionCard>
      ) : null}

      {isError ? (
        <SectionCard>
          <p className="text-sm text-rose-700">Failed to load inspections data. Please refresh the page.</p>
        </SectionCard>
      ) : null}

      <header className="rounded-2xl border border-cyan-200/50 bg-[linear-gradient(120deg,#f0fdfa_0%,#ecfeff_50%,#f8fafc_100%)] p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Inspection Center</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Create Inspection</h2>
            <p className="mt-1 text-slate-600">Input hasil inspeksi harian untuk tracking kepatuhan dan tindak lanjut.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-cyan-200 bg-white/80 px-3 py-2 text-center">
              <p className="text-xs text-slate-500">Today</p>
              <p className="font-semibold text-slate-900">{filteredInspections.length} Inspections</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white/80 px-3 py-2 text-center">
              <p className="text-xs text-slate-500">Open Action</p>
              <button
                type="button"
                onClick={() => openCapaTracker('INSP', 'Open Action')}
                className="font-semibold text-amber-700 transition hover:text-amber-800"
              >
                {openActionCount} Items
              </button>
            </div>
          </div>
        </div>
      </header>

      <article className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: 'Semua Area', value: 'all' as const },
            { label: 'Warehouse', value: 'warehouse' as const },
            { label: 'Production', value: 'production' as const },
            { label: 'Utilities', value: 'utilities' as const },
            { label: 'Loading Bay', value: 'loading-bay' as const },
          ].map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveAreaFilter(filter.value)}
              className={
                activeAreaFilter === filter.value
                  ? 'rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white'
                  : 'rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-cyan-400'
              }
            >
              {filter.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setHasRelatedCapaOnly(!hasRelatedCapaOnly)}
            className={
              hasRelatedCapaOnly
                ? 'rounded-full bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white'
                : 'rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-violet-300'
            }
          >
            Has Related CAPA
          </button>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={resetTableState}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
          >
            Reset Table State
          </button>
        </div>

        <div className="mt-4">
          <DataTable
            rows={filteredInspections}
            rowKey={(item) => item.id}
            controlledState={{
              searchTerm: tableSearchTerm,
              sortKey: tableSortKey,
              sortDirection: tableSortDesc ? 'desc' : 'asc',
              currentPage: tablePage,
              pageSize: tablePageSize,
            }}
            onControlledStateChange={(nextState) => {
              setTableSearchTerm(nextState.searchTerm)

              if (nextState.sortKey && inspectionTableSortValues.includes(nextState.sortKey as InspectionTableSortKey)) {
                setTableSortKey(nextState.sortKey as InspectionTableSortKey)
              }

              setTableSortDesc(nextState.sortDirection === 'desc')
              setTablePage(nextState.currentPage)
              setTablePageSize(nextState.pageSize)
            }}
            searchConfig={{
              enabled: true,
              placeholder: 'Search inspection ID, area, inspector, or status...',
              getSearchText: (item) => `${item.id} ${item.area} ${item.inspector} ${item.status}`,
            }}
            paginationConfig={{
              enabled: true,
              initialPageSize: 5,
              pageSizeOptions: [3, 5, 10],
            }}
            columns={[
              {
                key: 'id',
                header: 'Inspection ID',
                cellClassName: 'font-semibold text-slate-800',
                sortable: true,
                sortValue: (item) => item.id,
                cell: (item) => item.id,
              },
              {
                key: 'area',
                header: 'Area',
                cellClassName: 'text-slate-700',
                sortable: true,
                sortValue: (item) => item.area,
                cell: (item) => item.area,
              },
              {
                key: 'inspector',
                header: 'Inspector',
                cellClassName: 'text-slate-700',
                sortable: true,
                sortValue: (item) => item.inspector,
                cell: (item) => item.inspector,
              },
              {
                key: 'score',
                header: 'Score',
                sortable: true,
                sortValue: (item) => item.score,
                cell: (item) => <Badge label={`${item.score}`} tone="cyan" />,
              },
              {
                key: 'status',
                header: 'Status',
                sortable: true,
                sortValue: (item) => item.status,
                cell: (item) => <Badge label={item.status} tone={item.status === 'Closed' ? 'emerald' : 'amber'} />,
              },
              {
                key: 'relatedCapa',
                header: 'Related CAPA',
                sortable: true,
                sortValue: (item) => getInspectionActionCount(item.id),
                cell: (item) => {
                  const relatedCount = getInspectionActionCount(item.id)

                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (relatedCount > 0) {
                          navigate(`/actions?action=focus&aQ=${encodeURIComponent(item.id)}`)
                          addToast(`Menampilkan CAPA terkait untuk ${item.id}.`, 'emerald')
                          return
                        }

                        openCapaTracker(item.id, item.status)
                      }}
                      className={
                        relatedCount > 0
                          ? 'rounded-full border border-cyan-300 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100'
                          : 'rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 transition hover:border-violet-300 hover:text-violet-700'
                      }
                    >
                      {relatedCount} item{relatedCount === 1 ? '' : 's'}
                    </button>
                  )
                },
              },
              {
                key: 'actions',
                header: 'Actions',
                cellClassName: 'text-right',
                cell: (item) => (
                  <div className="relative inline-block group">
                    <button
                      type="button"
                      onClick={() => {
                        if (!canCreate) {
                          return
                        }

                        openCapaTracker(item.id, item.status)
                      }}
                      disabled={!canCreate}
                      className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Create CAPA
                    </button>
                    {!canCreate ? (
                      <span className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                        Hanya Supervisor/Administrator
                      </span>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        </div>
      </article>

      <SectionCard title="Related Corrective Actions" subtitle="Tindak lanjut CAPA yang berasal dari hasil inspection aktif.">
        <div className="grid gap-4 lg:grid-cols-2">
          {actionsByInspection.map(({ inspection, actions }) => (
            <article key={inspection.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{inspection.id}</p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">{inspection.area}</h3>
                  <p className="mt-1 text-sm text-slate-600">Inspector: {inspection.inspector}</p>
                </div>
                <Badge label={`${actions.length} CAPA`} tone={actions.length > 0 ? 'cyan' : 'slate'} />
              </div>

              <div className="mt-3 space-y-2">
                {actions.length > 0 ? (
                  actions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => navigate(`/actions/${action.id}`)}
                      className="block w-full rounded-xl border border-white bg-white p-3 text-left shadow-sm transition hover:border-cyan-200"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{action.title}</p>
                        <Badge label={action.status} tone={action.status === 'Done' ? 'emerald' : action.status === 'Blocked' ? 'amber' : 'cyan'} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{action.id} • Owner: {action.owner}</p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">
                    <p>Belum ada CAPA terkait untuk inspection ini.</p>
                    <div className="relative inline-block group mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!canCreate) {
                            return
                          }

                          setCreateActionTargetId(inspection.id)
                        }}
                        disabled={!canCreate}
                        className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Create CAPA Now
                      </button>
                      {!canCreate ? (
                        <span className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                          Hanya Supervisor/Administrator
                        </span>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <Modal
        isOpen={Boolean(createActionTarget)}
        title={createActionTarget ? `Create CAPA for ${createActionTarget.id}` : 'Create CAPA'}
        subtitle={createActionTarget ? `${createActionTarget.area} • ${createActionTarget.inspector}` : undefined}
        onClose={() => setCreateActionTargetId(null)}
      >
        {createActionTarget ? (
          <form onSubmit={submitCreateAction} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Action Title</span>
              <input
                value={nextActionTitle}
                onChange={(event) => setNextActionTitle(event.target.value)}
                placeholder="Contoh: briefing ulang kepatuhan APD dan pasang signage"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Owner</span>
              <input
                value={nextActionOwner}
                onChange={(event) => setNextActionOwner(event.target.value)}
                placeholder="Supervisor Shift"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Priority</span>
              <select
                value={nextActionPriority}
                onChange={(event) => setNextActionPriority(event.target.value as 'Critical' | 'High' | 'Medium')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
              </select>
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateActionTargetId(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createActionMutation.isPending || !canCreate}
                className="rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createActionMutation.isPending ? 'Creating...' : 'Create CAPA'}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      <SectionCard title="New Inspection Form" subtitle="Lengkapi data berikut untuk membuat inspeksi baru.">
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Area</span>
          <input
            {...register('area')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-teal-200 transition focus:ring"
            placeholder="Warehouse A"
          />
          {errors.area ? <p className="text-xs text-rose-700">{errors.area.message}</p> : null}
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Inspector</span>
          <input
            {...register('inspector')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-teal-200 transition focus:ring"
            placeholder="Rizky"
          />
          {errors.inspector ? <p className="text-xs text-rose-700">{errors.inspector.message}</p> : null}
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Score</span>
          <input
            type="number"
            {...register('score')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-teal-200 transition focus:ring"
          />
          {errors.score ? <p className="text-xs text-rose-700">{errors.score.message}</p> : null}
        </label>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-800">Checklist Category</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-700">
            {['APD', 'Housekeeping', 'Electrical', 'Fire Safety'].map((item) => (
              <label key={item} className="inline-flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" defaultChecked={item === 'APD'} />
                {item}
              </label>
            ))}
          </div>
        </div>

          <div className="flex items-end">
            <div className="grid w-full gap-2 md:grid-cols-2">
              <button
                type="button"
                onClick={() => resetConfirm.open(true)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 transition hover:border-cyan-400"
              >
                Reset Form
              </button>
              <button
                type="submit"
                disabled={isSubmitting || createInspectionMutation.isPending}
                className="w-full rounded-lg bg-teal-600 px-4 py-2 font-medium text-white transition hover:bg-teal-700 disabled:opacity-60"
              >
                {isSubmitting || createInspectionMutation.isPending ? 'Saving...' : 'Save Inspection'}
              </button>
            </div>
          </div>
        </form>
      </SectionCard>

      <ConfirmActionModal
        isOpen={resetConfirm.isOpen}
        title="Reset Inspection Form"
        message="Semua input pada form akan dibersihkan. Lanjutkan reset?"
        confirmLabel="Yes, Reset"
        isSubmitting={isResetting}
        onCancel={resetConfirm.close}
        onConfirm={() => void runReset()}
      />
    </section>
  )
}
