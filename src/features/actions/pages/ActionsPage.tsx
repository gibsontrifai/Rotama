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
import { Badge, ConfirmActionModal, DataTable, MetricCard, Modal, SectionCard } from '../../../shared/ui'
import { createTableQueryParamKeys } from '../../../shared/utils/createTableQueryParamKeys'
import { canManageActions } from '../../../app/rbac'
import {
  fetchActionsMock,
  isActionDueSoon,
  isActionDueToday,
  isActionOverdue,
  parseMockActionDate,
  type ActionItem,
  type ActionPriority,
  type ActionStatus,
} from '../api/actionsApi'
import { useAssignActionOwnerMutation, useUpdateActionStatusMutation } from '../api/actionsMutations'
import { actionsQueryKeys } from '../api/actionsQueryKeys'

const statusValues = ['All', 'Open', 'In Progress', 'Blocked', 'Done'] as const
const priorityValues = ['All', 'Critical', 'High', 'Medium'] as const
const focusValues = ['All', 'Overdue', 'Due Today', 'Due Soon'] as const
const sourceValues = ['All', 'Incident', 'Inspection', 'Audit'] as const
const tableSortValues = ['id', 'title', 'area', 'priority', 'status', 'owner', 'dueDate', 'progress'] as const

type StatusFilter = (typeof statusValues)[number]
type PriorityFilter = (typeof priorityValues)[number]
type FocusFilter = (typeof focusValues)[number]
type SourceFilter = (typeof sourceValues)[number]
type TableSortKey = (typeof tableSortValues)[number]

const tableQueryKeys = createTableQueryParamKeys('a')

function getPriorityTone(priority: ActionPriority) {
  if (priority === 'Critical') {
    return 'rose'
  }

  if (priority === 'High') {
    return 'amber'
  }

  return 'cyan'
}

function getStatusTone(status: ActionStatus) {
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

function hasUpdatedToday(action: ActionItem) {
  return action.updates.some((update) => update.time.startsWith('11 Apr'))
}

export function ActionsPage() {
  const navigate = useNavigate()
  const consumeActionParam = useConsumeActionParam()
  const role = useAuthStore((state) => state.session?.role ?? 'technician')
  const addToast = useToastStore((state) => state.addToast)
  const assignOwnerMutation = useAssignActionOwnerMutation()
  const updateStatusMutation = useUpdateActionStatusMutation()
  const { data: actions = [], isLoading, isError } = useQuery({
    queryKey: actionsQueryKeys.mock(),
    queryFn: fetchActionsMock,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  const { value: statusFilter, setValue: setStatusFilter } = useQueryParamEnum<StatusFilter>({
    key: 'status',
    values: statusValues,
    defaultValue: 'All',
  })
  const { value: priorityFilter, setValue: setPriorityFilter } = useQueryParamEnum<PriorityFilter>({
    key: 'priority',
    values: priorityValues,
    defaultValue: 'All',
  })
  const { value: focusFilter, setValue: setFocusFilter } = useQueryParamEnum<FocusFilter>({
    key: 'focus',
    values: focusValues,
    defaultValue: 'All',
  })
  const { value: sourceFilter, setValue: setSourceFilter } = useQueryParamEnum<SourceFilter>({
    key: 'source',
    values: sourceValues,
    defaultValue: 'All',
  })
  const { value: tableSearchTerm, setValue: setTableSearchTerm } = useQueryParamString({
    key: tableQueryKeys.search,
    defaultValue: '',
  })
  const { value: tableSortKey, setValue: setTableSortKey } = useQueryParamEnum<TableSortKey>({
    key: tableQueryKeys.sort,
    values: tableSortValues,
    defaultValue: 'priority',
  })
  const { value: tableSortDesc, setValue: setTableSortDesc } = useQueryParamBoolean({
    key: tableQueryKeys.desc,
    defaultValue: false,
  })
  const { value: tablePage, setValue: setTablePage } = useQueryParamNumber({
    key: tableQueryKeys.page,
    defaultValue: 1,
    min: 1,
  })
  const { value: tablePageSize, setValue: setTablePageSize } = useQueryParamNumber({
    key: tableQueryKeys.size,
    defaultValue: 4,
    min: 4,
    max: 20,
  })

  const [assignTargetId, setAssignTargetId] = useState<string | null>(null)
  const [nextOwner, setNextOwner] = useState('')
  const doneConfirm = useConfirmAction<string>()

  useEffect(() => {
    const consumed = consumeActionParam('focus')
    if (!consumed) {
      return
    }

    addToast('Tracker CAPA dibuka untuk prioritas aksi harian.', 'emerald')
  }, [addToast, consumeActionParam])

  const visibleActions = useMemo(() => {
    return actions.filter((action) => {
      if (statusFilter !== 'All' && action.status !== statusFilter) {
        return false
      }

      if (priorityFilter !== 'All' && action.priority !== priorityFilter) {
        return false
      }

      if (sourceFilter !== 'All' && action.source !== sourceFilter) {
        return false
      }

      if (focusFilter === 'Overdue' && !isActionOverdue(action)) {
        return false
      }

      if (focusFilter === 'Due Today' && !isActionDueToday(action)) {
        return false
      }

      if (focusFilter === 'Due Soon' && !isActionDueSoon(action)) {
        return false
      }

      return true
    })
  }, [actions, focusFilter, priorityFilter, sourceFilter, statusFilter])

  const assignTarget = useMemo(() => visibleActions.find((action) => action.id === assignTargetId) ?? null, [assignTargetId, visibleActions])
  const doneTarget = useMemo(() => actions.find((action) => action.id === doneConfirm.target) ?? null, [actions, doneConfirm.target])
  const canManage = canManageActions(role)

  const openCount = visibleActions.filter((action) => action.status === 'Open').length
  const progressCount = visibleActions.filter((action) => action.status === 'In Progress').length
  const blockedCount = visibleActions.filter((action) => action.status === 'Blocked').length
  const overdueCount = visibleActions.filter((action) => action.status !== 'Done' && isActionOverdue(action)).length
  const dueTodayCount = visibleActions.filter((action) => action.status !== 'Done' && isActionDueToday(action)).length
  const dueSoonCount = visibleActions.filter((action) => action.status !== 'Done' && isActionDueSoon(action)).length
  const attachmentCount = visibleActions.filter((action) => action.attachments.length > 0).length
  const updatedTodayCount = visibleActions.filter(hasUpdatedToday).length

  const resetTableState = () => {
    setTableSearchTerm('')
    setTableSortKey('priority')
    setTableSortDesc(false)
    setTablePage(1)
    setTablePageSize(4)
  }

  const resetAllState = () => {
    setStatusFilter('All')
    setPriorityFilter('All')
    setFocusFilter('All')
    setSourceFilter('All')
    resetTableState()
  }

  const onSubmitOwner = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const owner = nextOwner.trim()

    if (!assignTargetId || owner.length < 2) {
      return
    }

    await assignOwnerMutation.mutateAsync({ actionId: assignTargetId, owner })
    addToast(`Owner untuk ${assignTargetId} diperbarui ke ${owner}.`, 'emerald')
    setAssignTargetId(null)
    setNextOwner('')
  }

  const markDone = async () => {
    if (!doneConfirm.target) {
      return
    }

    await updateStatusMutation.mutateAsync({ actionId: doneConfirm.target, status: 'Done' })
    addToast(`Action ${doneConfirm.target} ditandai selesai.`, 'emerald')
    doneConfirm.close()
  }

  return (
    <section className="space-y-6">
      {isLoading ? (
        <SectionCard>
          <p className="text-sm text-slate-600">Loading corrective actions...</p>
        </SectionCard>
      ) : null}

      {isError ? (
        <SectionCard>
          <p className="text-sm text-rose-700">Failed to load corrective actions. Please refresh the page.</p>
        </SectionCard>
      ) : null}

      <header className="rounded-2xl border border-emerald-200/60 bg-[linear-gradient(120deg,#ecfdf5_0%,#eff6ff_50%,#f8fafc_100%)] p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Corrective Actions</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">CAPA Tracker</h2>
            <p className="mt-1 text-slate-600">Kelola tindakan korektif dari incident, inspection, dan audit dalam satu alur tindak lanjut.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={resetAllState}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Open Actions" value={`${openCount}`} trend="down" />
        <MetricCard label="In Progress" value={`${progressCount}`} trend="up" />
        <MetricCard label="Overdue" value={`${overdueCount}`} trend={overdueCount > 0 ? 'down' : 'up'} />
        <MetricCard label="Due Today" value={`${dueTodayCount}`} trend={dueTodayCount > 2 ? 'down' : 'up'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <SectionCard title="Execution Board" subtitle="Snapshot status tindak lanjut prioritas.">
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { title: 'Open', tone: 'rose' as const, items: visibleActions.filter((action) => action.status === 'Open') },
              { title: 'In Progress', tone: 'cyan' as const, items: visibleActions.filter((action) => action.status === 'In Progress') },
              { title: 'Blocked', tone: 'amber' as const, items: visibleActions.filter((action) => action.status === 'Blocked') },
            ].map((group) => (
              <div key={group.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{group.title}</p>
                  <Badge label={`${group.items.length}`} tone={group.tone} />
                </div>
                <div className="mt-3 space-y-3">
                  {group.items.slice(0, 2).map((action) => (
                    <div key={action.id} className="rounded-xl border border-white bg-white p-3 shadow-sm">
                      <p className="text-sm font-semibold text-slate-900">{action.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{action.id} • {action.owner}</p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-[linear-gradient(90deg,#0ea5e9_0%,#22c55e_100%)]" style={{ width: `${action.progress}%` }} />
                      </div>
                    </div>
                  ))}

                  {group.items.length === 0 ? <p className="text-sm text-slate-500">Tidak ada action pada status ini.</p> : null}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Filters" subtitle="Fokuskan action tracker per prioritas dan status.">
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {statusValues.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Priority</span>
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {priorityValues.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Focus</span>
              <select
                value={focusFilter}
                onChange={(event) => setFocusFilter(event.target.value as FocusFilter)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {focusValues.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Source</span>
              <div className="flex flex-wrap gap-2">
                {sourceValues.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSourceFilter(value)}
                    className={
                      sourceFilter === value
                        ? 'rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white'
                        : 'rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-cyan-300'
                    }
                  >
                    {value}
                  </button>
                ))}
              </div>
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">Active Focus</p>
              <p className="mt-2">Status: <span className="font-medium text-slate-900">{statusFilter}</span></p>
              <p>Priority: <span className="font-medium text-slate-900">{priorityFilter}</span></p>
              <p>Focus: <span className="font-medium text-slate-900">{focusFilter}</span></p>
              <p>Source: <span className="font-medium text-slate-900">{sourceFilter}</span></p>
              <p>Total visible actions: <span className="font-medium text-slate-900">{visibleActions.length}</span></p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge label={`${blockedCount} blocked`} tone="amber" />
                <Badge label={`${dueSoonCount} due soon`} tone="cyan" />
                <Badge label={`${attachmentCount} has attachments`} tone="slate" />
                <Badge label={`${updatedTodayCount} updated today`} tone="cyan" />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Action Register" subtitle="Pantau owner, SLA, progress, dan sumber action item.">
        <div className="flex justify-end">
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
            rows={visibleActions}
            rowKey={(action) => action.id}
            minWidthClassName="min-w-[920px]"
            controlledState={{
              searchTerm: tableSearchTerm,
              sortKey: tableSortKey,
              sortDirection: tableSortDesc ? 'desc' : 'asc',
              currentPage: tablePage,
              pageSize: tablePageSize,
            }}
            onControlledStateChange={(nextState) => {
              setTableSearchTerm(nextState.searchTerm)

              if (nextState.sortKey && tableSortValues.includes(nextState.sortKey as TableSortKey)) {
                setTableSortKey(nextState.sortKey as TableSortKey)
              }

              setTableSortDesc(nextState.sortDirection === 'desc')
              setTablePage(nextState.currentPage)
              setTablePageSize(nextState.pageSize)
            }}
            searchConfig={{
              enabled: true,
              placeholder: 'Search by action ID, title, area, owner, or source ref...',
              getSearchText: (action) => `${action.id} ${action.title} ${action.area} ${action.owner} ${action.source} ${action.sourceRef}`,
            }}
            paginationConfig={{
              enabled: true,
              initialPageSize: 4,
              pageSizeOptions: [4, 6, 10],
            }}
            exportConfig={{
              enabled: true,
              fileName: 'capa-tracker.csv',
              headers: ['Action ID', 'Title', 'Area', 'Source', 'Priority', 'Status', 'Owner', 'Due Date', 'Progress'],
              getRow: (action) => [
                action.id,
                action.title,
                action.area,
                `${action.source} ${action.sourceRef}`,
                action.priority,
                action.status,
                action.owner,
                action.dueDate,
                `${action.progress}%`,
              ],
            }}
            columns={[
              {
                key: 'id',
                header: 'Action ID',
                cellClassName: 'font-semibold text-slate-800',
                sortable: true,
                sortValue: (action: ActionItem) => action.id,
                cell: (action: ActionItem) => action.id,
              },
              {
                key: 'title',
                header: 'Action',
                cellClassName: 'text-slate-800',
                sortable: true,
                sortValue: (action: ActionItem) => action.title,
                cell: (action: ActionItem) => action.title,
              },
              {
                key: 'area',
                header: 'Area',
                cellClassName: 'text-slate-700',
                sortable: true,
                sortValue: (action: ActionItem) => action.area,
                cell: (action: ActionItem) => action.area,
              },
              {
                key: 'priority',
                header: 'Priority',
                sortable: true,
                sortValue: (action: ActionItem) => action.priority,
                cell: (action: ActionItem) => <Badge label={action.priority} tone={getPriorityTone(action.priority)} />,
              },
              {
                key: 'status',
                header: 'Status',
                sortable: true,
                sortValue: (action: ActionItem) => action.status,
                cell: (action: ActionItem) => <Badge label={action.status} tone={getStatusTone(action.status)} />,
              },
              {
                key: 'owner',
                header: 'Owner',
                cellClassName: 'text-slate-700',
                sortable: true,
                sortValue: (action: ActionItem) => action.owner,
                cell: (action: ActionItem) => action.owner,
              },
              {
                key: 'dueDate',
                header: 'Due Date',
                cellClassName: 'text-slate-600',
                sortable: true,
                sortValue: (action: ActionItem) => {
                  const parsed = parseMockActionDate(action.dueDate)
                  return parsed ? parsed.getTime() : Number.MAX_SAFE_INTEGER
                },
                cell: (action: ActionItem) => action.dueDate,
              },
              {
                key: 'progress',
                header: 'Progress',
                sortable: true,
                sortValue: (action: ActionItem) => action.progress,
                cell: (action: ActionItem) => (
                  <div className="flex min-w-[130px] items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-[linear-gradient(90deg,#06b6d4_0%,#22c55e_100%)]" style={{ width: `${action.progress}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-600">{action.progress}%</span>
                  </div>
                ),
              },
              {
                key: 'signals',
                header: 'Signals',
                cell: (action: ActionItem) => (
                  <div className="flex min-w-[170px] flex-wrap gap-1.5">
                    {action.attachments.length > 0 ? (
                      <Badge label={`${action.attachments.length} attachment${action.attachments.length > 1 ? 's' : ''}`} tone="slate" />
                    ) : null}
                    {hasUpdatedToday(action) ? <Badge label="updated today" tone="cyan" /> : null}
                    {action.attachments.length === 0 && !hasUpdatedToday(action) ? (
                      <span className="text-xs font-medium text-slate-400">No recent signal</span>
                    ) : null}
                  </div>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                cellClassName: 'text-right',
                cell: (action: ActionItem) => (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/actions/${action.id}`)}
                      className="rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    >
                      View Details
                    </button>
                    <div className="relative group">
                      <button
                        type="button"
                        onClick={() => {
                          if (!canManage) {
                            return
                          }

                          setAssignTargetId(action.id)
                          setNextOwner(action.owner)
                        }}
                        disabled={!canManage}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        Update Owner
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
                        disabled={action.status === 'Done' || !canManage}
                        onClick={() => {
                          if (!canManage) {
                            return
                          }

                          doneConfirm.open(action.id)
                        }}
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        Mark Done
                      </button>
                      {!canManage ? (
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

      <Modal isOpen={assignTarget !== null} title="Update Action Owner" onClose={() => setAssignTargetId(null)}>
        <form onSubmit={onSubmitOwner} className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">{assignTarget?.title}</p>
            <p className="mt-1">{assignTarget?.id} • {assignTarget?.area}</p>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Owner</span>
            <input
              value={nextOwner}
              onChange={(event) => setNextOwner(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Masukkan nama owner baru"
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAssignTargetId(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assignOwnerMutation.isPending || !canManage}
              title={!canManage ? 'Hanya Supervisor/Administrator' : 'Save owner'}
              className="rounded-lg border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {assignOwnerMutation.isPending ? 'Saving...' : 'Save Owner'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmActionModal
        isOpen={doneConfirm.isOpen}
        title="Mark Action as Done"
        message={doneTarget ? `Tandai ${doneTarget.id} sebagai selesai dan update progress menjadi 100%?` : 'Tandai action ini sebagai selesai?'}
        confirmLabel={updateStatusMutation.isPending ? 'Saving...' : 'Mark Done'}
        isSubmitting={updateStatusMutation.isPending}
        onCancel={doneConfirm.close}
        onConfirm={() => void markDone()}
      />
    </section>
  )
}