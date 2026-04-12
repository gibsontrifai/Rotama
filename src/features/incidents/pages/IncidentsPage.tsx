import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useConsumeActionParam } from '../../../shared/hooks/useConsumeActionParam'
import { useConfirmAction } from '../../../shared/hooks/useConfirmAction'
import { useQueryParamBoolean } from '../../../shared/hooks/useQueryParamBoolean'
import { useQueryParamEnum } from '../../../shared/hooks/useQueryParamEnum'
import { useQueryParamNumber } from '../../../shared/hooks/useQueryParamNumber'
import { useQueryParamString } from '../../../shared/hooks/useQueryParamString'
import { useAuthStore } from '../../../shared/store/useAuthStore'
import { useToastStore } from '../../../shared/store/useToastStore'
import { Badge, ConfirmActionModal, DataTable, Modal, SectionCard } from '../../../shared/ui'
import { createTableQueryParamKeys } from '../../../shared/utils/createTableQueryParamKeys'
import { canCreateCapa, canManageIncidents } from '../../../app/rbac'
import { fetchActionsMock } from '../../actions/api/actionsApi'
import { useCreateActionMutation } from '../../actions/api/actionsMutations'
import { actionsQueryKeys } from '../../actions/api/actionsQueryKeys'
import { fetchIncidentsMock, type IncidentItem } from '../api/incidentsApi'
import { useAssignIncidentPicMutation, useCloseIncidentMutation } from '../api/incidentsMutations'
import { incidentsQueryKeys } from '../api/incidentsQueryKeys'

const incidentFilters = ['All', 'Critical', 'High', 'Medium', 'Low', 'Open', 'Investigating', 'Closed'] as const
type IncidentFilter = (typeof incidentFilters)[number]
const incidentTableSortValues = ['id', 'title', 'area', 'severity', 'status', 'pic', 'reportedAt'] as const
type IncidentTableSortKey = (typeof incidentTableSortValues)[number]
const tableQueryKeys = createTableQueryParamKeys('i')

function getSeverityTone(severity: IncidentItem['severity']) {
  if (severity === 'Critical') {
    return 'rose'
  }

  if (severity === 'High') {
    return 'amber'
  }

  if (severity === 'Medium') {
    return 'cyan'
  }

  return 'emerald'
}

function getStatusTone(status: IncidentItem['status']) {
  if (status === 'Open') {
    return 'rose'
  }

  if (status === 'Investigating') {
    return 'amber'
  }

  return 'emerald'
}

export function IncidentsPage() {
  const navigate = useNavigate()
  const consumeActionParam = useConsumeActionParam()
  const role = useAuthStore((state) => state.session?.role ?? 'technician')
  const addToast = useToastStore((state) => state.addToast)
  const assignPicMutation = useAssignIncidentPicMutation()
  const closeIncidentMutation = useCloseIncidentMutation()
  const createActionMutation = useCreateActionMutation()
  const { data: queriedIncidents = [], isLoading, isError } = useQuery({
    queryKey: incidentsQueryKeys.mock(),
    queryFn: fetchIncidentsMock,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
  const { data: relatedActions = [] } = useQuery({
    queryKey: actionsQueryKeys.mock(),
    queryFn: fetchActionsMock,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  const { value: activeFilter, setValue: setActiveFilter } = useQueryParamEnum<IncidentFilter>({
    key: 'filter',
    values: incidentFilters,
    defaultValue: 'All',
  })
  const { value: tableSearchTerm, setValue: setTableSearchTerm } = useQueryParamString({
    key: tableQueryKeys.search,
    defaultValue: '',
  })
  const { value: tableSortKey, setValue: setTableSortKey } = useQueryParamEnum<IncidentTableSortKey>({
    key: tableQueryKeys.sort,
    values: incidentTableSortValues,
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
    defaultValue: 3,
    min: 3,
    max: 20,
  })
  const [assignTargetId, setAssignTargetId] = useState<string | null>(null)
  const [assignPic, setAssignPic] = useState('')
  const [createActionTargetId, setCreateActionTargetId] = useState<string | null>(null)
  const [nextActionTitle, setNextActionTitle] = useState('')
  const [nextActionOwner, setNextActionOwner] = useState('')
  const [nextActionPriority, setNextActionPriority] = useState<'Critical' | 'High' | 'Medium'>('High')
  const closeConfirm = useConfirmAction<string>()
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [closingId, setClosingId] = useState<string | null>(null)

  useEffect(() => {
    const consumed = consumeActionParam('report')
    if (!consumed) {
      return
    }

    addToast('Mode pelaporan incident aktif. Silakan pilih data incident untuk diproses.', 'emerald')
  }, [addToast, consumeActionParam])

  const assignTarget = useMemo(() => queriedIncidents.find((incident) => incident.id === assignTargetId) ?? null, [assignTargetId, queriedIncidents])
  const createActionTarget = useMemo(
    () => queriedIncidents.find((incident) => incident.id === createActionTargetId) ?? null,
    [createActionTargetId, queriedIncidents],
  )
  const closeTarget = useMemo(() => queriedIncidents.find((incident) => incident.id === closeConfirm.target) ?? null, [closeConfirm.target, queriedIncidents])
  const canManage = canManageIncidents(role)
  const canCreate = canCreateCapa(role)

  const filteredIncidents = useMemo(() => {
    return queriedIncidents.filter((item) => {
      const matchesPrimaryFilter =
        activeFilter === 'All' ? true : item.severity === activeFilter || item.status === activeFilter

      if (!matchesPrimaryFilter) {
        return false
      }

      if (!hasRelatedCapaOnly) {
        return true
      }

      return relatedActions.some((action) => action.source === 'Incident' && action.sourceRef === item.id)
    })
  }, [activeFilter, hasRelatedCapaOnly, queriedIncidents, relatedActions])

  const openAssignModal = (incident: IncidentItem) => {
    setAssignTargetId(incident.id)
    setAssignPic(incident.pic)
  }

  const openCapaTracker = (incident: IncidentItem) => {
    navigate(
      `/actions?action=focus&aQ=${encodeURIComponent(incident.id)}&status=${incident.status === 'Closed' ? 'Done' : 'Open'}&priority=${incident.severity === 'Low' ? 'Medium' : incident.severity}`,
    )
    addToast(`CAPA tracker dibuka untuk ${incident.id}.`, 'emerald')
  }

  const closeIncident = async (incidentId: string) => {
    setClosingId(incidentId)
    await closeIncidentMutation.mutateAsync({ incidentId })
    closeConfirm.close()
    setClosingId(null)
    addToast(`Incident ${incidentId} berhasil ditutup.`, 'emerald')
  }

  const submitAssign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextPic = assignPic.trim()

    if (!assignTargetId || nextPic.length < 2) {
      return
    }

    setAssigningId(assignTargetId)
    await assignPicMutation.mutateAsync({ incidentId: assignTargetId, pic: nextPic })
    addToast(`PIC untuk ${assignTargetId} diperbarui ke ${nextPic}.`, 'emerald')
    setAssigningId(null)
    setAssignTargetId(null)
    setAssignPic('')
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
      source: 'Incident',
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

  const openCount = filteredIncidents.filter((item) => item.status === 'Open').length
  const investigatingCount = filteredIncidents.filter((item) => item.status === 'Investigating').length

  const statusGroups: Array<{
    title: 'Open' | 'Investigating' | 'Closed'
    tone: 'rose' | 'amber' | 'emerald'
    items: IncidentItem[]
  }> = [
    { title: 'Open', tone: 'rose', items: filteredIncidents.filter((item) => item.status === 'Open') },
    { title: 'Investigating', tone: 'amber', items: filteredIncidents.filter((item) => item.status === 'Investigating') },
    { title: 'Closed', tone: 'emerald', items: filteredIncidents.filter((item) => item.status === 'Closed') },
  ]
  const actionsByIncident = useMemo(() => {
    return filteredIncidents.map((incident) => ({
      incident,
      actions: relatedActions.filter((action) => action.source === 'Incident' && action.sourceRef === incident.id),
    }))
  }, [filteredIncidents, relatedActions])

  const getIncidentActionCount = (incidentId: string) =>
    relatedActions.filter((action) => action.source === 'Incident' && action.sourceRef === incidentId).length

  const resetTableState = () => {
    setTableSearchTerm('')
    setTableSortKey('id')
    setTableSortDesc(false)
    setTablePage(1)
    setTablePageSize(3)
  }

  return (
    <section className="space-y-6">
      {isLoading ? (
        <SectionCard>
          <p className="text-sm text-slate-600">Loading incident data...</p>
        </SectionCard>
      ) : null}

      {isError ? (
        <SectionCard>
          <p className="text-sm text-rose-700">Failed to load incident data. Please refresh the page.</p>
        </SectionCard>
      ) : null}

      <header className="rounded-2xl border border-rose-200/60 bg-[linear-gradient(120deg,#fff1f2_0%,#fef3f2_48%,#f8fafc_100%)] p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">Incident Management</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Incident Register</h2>
            <p className="mt-1 text-slate-600">Daftar insiden terbaru untuk investigasi, tindakan korektif, dan penutupan.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-rose-200 bg-white/80 px-3 py-2 text-center">
              <p className="text-xs text-slate-500">Open Cases</p>
              <p className="font-semibold text-rose-700">{openCount} Cases</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white/80 px-3 py-2 text-center">
              <p className="text-xs text-slate-500">Investigating</p>
              <p className="font-semibold text-amber-700">{investigatingCount} Cases</p>
            </div>
          </div>
        </div>
      </header>

      <SectionCard>
        <div className="flex flex-wrap items-center gap-2">
          {incidentFilters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setActiveFilter(item)}
              className={
                activeFilter === item
                  ? 'rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white'
                  : 'rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-rose-300'
              }
            >
              {item}
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
            rows={filteredIncidents}
            rowKey={(incident) => incident.id}
            minWidthClassName="min-w-[760px]"
            controlledState={{
              searchTerm: tableSearchTerm,
              sortKey: tableSortKey,
              sortDirection: tableSortDesc ? 'desc' : 'asc',
              currentPage: tablePage,
              pageSize: tablePageSize,
            }}
            onControlledStateChange={(nextState) => {
              setTableSearchTerm(nextState.searchTerm)

              if (nextState.sortKey && incidentTableSortValues.includes(nextState.sortKey as IncidentTableSortKey)) {
                setTableSortKey(nextState.sortKey as IncidentTableSortKey)
              }

              setTableSortDesc(nextState.sortDirection === 'desc')
              setTablePage(nextState.currentPage)
              setTablePageSize(nextState.pageSize)
            }}
            searchConfig={{
              enabled: true,
              placeholder: 'Search by incident ID, title, or area...',
              getSearchText: (incident) => `${incident.id} ${incident.title} ${incident.area} ${incident.pic} ${incident.status}`,
            }}
            paginationConfig={{
              enabled: true,
              initialPageSize: 3,
              pageSizeOptions: [3, 5, 10],
            }}
            exportConfig={{
              enabled: true,
              fileName: 'incident-register.csv',
              headers: ['Incident ID', 'Title', 'Area', 'Severity', 'Status', 'PIC', 'Reported At'],
              getRow: (incident) => [incident.id, incident.title, incident.area, incident.severity, incident.status, incident.pic, incident.reportedAt],
            }}
            columns={[
              {
                key: 'id',
                header: 'Incident ID',
                cellClassName: 'font-semibold text-slate-800',
                sortable: true,
                sortValue: (incident) => incident.id,
                cell: (incident) => incident.id,
              },
              {
                key: 'title',
                header: 'Title',
                cellClassName: 'text-slate-800',
                sortable: true,
                sortValue: (incident) => incident.title,
                cell: (incident) => incident.title,
              },
              {
                key: 'area',
                header: 'Area',
                cellClassName: 'text-slate-700',
                sortable: true,
                sortValue: (incident) => incident.area,
                cell: (incident) => incident.area,
              },
              {
                key: 'severity',
                header: 'Severity',
                sortable: true,
                sortValue: (incident) => incident.severity,
                cell: (incident) => <Badge label={incident.severity} tone={getSeverityTone(incident.severity)} />,
              },
              {
                key: 'status',
                header: 'Status',
                sortable: true,
                sortValue: (incident) => incident.status,
                cell: (incident) => <Badge label={incident.status} tone={getStatusTone(incident.status)} />,
              },
              {
                key: 'pic',
                header: 'PIC',
                cellClassName: 'text-slate-700',
                sortable: true,
                sortValue: (incident) => incident.pic,
                cell: (incident) => incident.pic,
              },
              {
                key: 'reportedAt',
                header: 'Reported At',
                cellClassName: 'text-slate-600',
                sortable: true,
                sortValue: (incident) => incident.reportedAt,
                cell: (incident) => incident.reportedAt,
              },
              {
                key: 'relatedCapa',
                header: 'Related CAPA',
                sortable: true,
                sortValue: (incident) => getIncidentActionCount(incident.id),
                cell: (incident) => {
                  const relatedCount = getIncidentActionCount(incident.id)

                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (relatedCount > 0) {
                          navigate(`/actions?action=focus&aQ=${encodeURIComponent(incident.id)}`)
                          addToast(`Menampilkan CAPA terkait untuk ${incident.id}.`, 'emerald')
                          return
                        }

                        openCapaTracker(incident)
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
                cell: (incident) => (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative group">
                      <button
                        type="button"
                        onClick={() => {
                          if (!canManage) {
                            return
                          }

                          openAssignModal(incident)
                        }}
                        disabled={assigningId === incident.id || !canManage}
                        className="rounded-md border border-cyan-300 bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {assigningId === incident.id ? 'Assigning...' : 'Assign PIC'}
                      </button>
                      {!canManage ? (
                        <span className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                          Hanya Supervisor/Administrator
                        </span>
                      ) : null}
                    </div>
                    <div className="relative group">
                      <button
                        type="button"
                        onClick={() => {
                          if (!canManage) {
                            return
                          }

                          closeConfirm.open(incident.id)
                        }}
                        disabled={incident.status === 'Closed' || closingId === incident.id || !canManage}
                        className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {closingId === incident.id ? 'Closing...' : 'Close Case'}
                      </button>
                      {!canManage ? (
                        <span className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                          Hanya Supervisor/Administrator
                        </span>
                      ) : null}
                    </div>
                    <div className="relative group">
                      <button
                        type="button"
                        onClick={() => {
                          if (!canCreate) {
                            return
                          }

                          openCapaTracker(incident)
                        }}
                        disabled={!canCreate}
                        className="rounded-md border border-violet-300 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Create CAPA
                      </button>
                      {!canCreate ? (
                        <span className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                          Hanya Supervisor/Administrator
                        </span>
                      ) : null}
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-3">
        {statusGroups.map((group) => (
          <article key={group.title} className="rounded-2xl border border-white/70 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">{group.title}</h3>
              <Badge label={`${group.items.length}`} tone={group.tone} className="px-2 py-1" />
            </div>

            <div className="mt-3 space-y-2">
              {group.items.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{item.id}</p>
                  <p className="mt-1 font-semibold text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-600">{item.area}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <SectionCard title="Related Corrective Actions" subtitle="CAPA yang terhubung langsung dengan incident register aktif.">
        <div className="grid gap-4 lg:grid-cols-2">
          {actionsByIncident.map(({ incident, actions }) => (
            <article key={incident.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{incident.id}</p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">{incident.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{incident.area}</p>
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
                        <Badge label={action.status} tone={getStatusTone(action.status === 'In Progress' ? 'Investigating' : action.status === 'Blocked' ? 'Investigating' : action.status === 'Done' ? 'Closed' : 'Open')} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{action.id} • Owner: {action.owner}</p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">
                    <p>Belum ada CAPA terkait untuk incident ini.</p>
                    <button
                      type="button"
                      onClick={() => {
                        if (!canCreate) {
                          return
                        }

                        setCreateActionTargetId(incident.id)
                      }}
                      disabled={!canCreate}
                      className="mt-3 rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                    >
                      Create CAPA Now
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <Modal
        isOpen={Boolean(assignTarget)}
        title={assignTarget ? `${assignTarget.id}` : 'Assign Incident'}
        subtitle={assignTarget?.title}
        onClose={() => setAssignTargetId(null)}
      >
        {assignTarget ? (
          <form onSubmit={submitAssign} className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">PIC Name</span>
              <input
                value={assignPic}
                onChange={(event) => setAssignPic(event.target.value)}
                placeholder="HSE Team"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-200 transition focus:ring"
              />
            </label>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAssignTargetId(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={assigningId === assignTarget.id || !canManage}
                className="rounded-lg border border-cyan-600 bg-cyan-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {assigningId === assignTarget.id ? 'Saving...' : 'Save PIC'}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(createActionTarget)}
        title={createActionTarget ? `Create CAPA for ${createActionTarget.id}` : 'Create CAPA'}
        subtitle={createActionTarget?.title}
        onClose={() => setCreateActionTargetId(null)}
      >
        {createActionTarget ? (
          <form onSubmit={submitCreateAction} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Action Title</span>
              <input
                value={nextActionTitle}
                onChange={(event) => setNextActionTitle(event.target.value)}
                placeholder="Contoh: pasang barrier area kerja dan briefing ulang operator"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Owner</span>
              <input
                value={nextActionOwner}
                onChange={(event) => setNextActionOwner(event.target.value)}
                placeholder="HSE Team"
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

      <ConfirmActionModal
        isOpen={Boolean(closeTarget)}
        title={closeTarget ? `Confirm ${closeTarget.id}` : 'Confirm Close Case'}
        message="Kasus akan dipindahkan ke status Closed. Lanjutkan?"
        confirmLabel={closeTarget && closingId === closeTarget.id ? 'Closing...' : 'Confirm Close'}
        isSubmitting={Boolean(closeTarget && closingId === closeTarget.id)}
        onCancel={closeConfirm.close}
        onConfirm={() => {
          if (!closeTarget || !canManage) {
            return
          }
          void closeIncident(closeTarget.id)
        }}
      />
    </section>
  )
}
