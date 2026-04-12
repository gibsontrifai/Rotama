import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  fetchActionsMock,
  isActionDueSoon,
  isActionDueToday,
  isActionOverdue,
  parseMockActionDate,
  type ActionItem,
} from '../../actions/api/actionsApi'
import { actionsQueryKeys } from '../../actions/api/actionsQueryKeys'
import { useToastStore } from '../../../shared/store/useToastStore'
import { useUiStore } from '../../../shared/store/useUiStore'
import { Badge, MetricCard, SectionCard } from '../../../shared/ui'

type Kpi = {
  label: string
  value: string
  trend: 'up' | 'down'
}

type ShiftSummary = {
  shift: string
  area: string
  completion: number
  incidents: number
}

const shiftSummary: ShiftSummary[] = [
  { shift: 'Shift A', area: 'Assembly Line', completion: 92, incidents: 0 },
  { shift: 'Shift B', area: 'Warehouse', completion: 76, incidents: 1 },
  { shift: 'Shift C', area: 'Loading Bay', completion: 84, incidents: 0 },
]

function getPriorityRank(priority: ActionItem['priority']) {
  if (priority === 'Critical') {
    return 0
  }

  if (priority === 'High') {
    return 1
  }

  return 2
}

function getStatusTone(status: ActionItem['status']) {
  if (status === 'Done') {
    return 'emerald'
  }

  if (status === 'Blocked') {
    return 'amber'
  }

  return 'cyan'
}

export function DashboardPage() {
  const navigate = useNavigate()
  const addToast = useToastStore((state) => state.addToast)
  const showCriticalOnly = useUiStore((state) => state.showCriticalOnly)
  const toggleCriticalOnly = useUiStore((state) => state.toggleCriticalOnly)
  const { data: actionItems = [] } = useQuery({
    queryKey: actionsQueryKeys.mock(),
    queryFn: fetchActionsMock,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  const kpis = useMemo(() => {
    const activeItems = actionItems.filter((item) => item.status !== 'Done')
    const criticalItems = activeItems.filter((item) => item.priority === 'Critical')
    const inspectionItems = actionItems.filter((item) => item.source === 'Inspection')
    const incidentItems = actionItems.filter((item) => item.source === 'Incident')

    const computedKpis: Kpi[] = [
      {
        label: 'Open Findings',
        value: String(activeItems.length),
        trend: activeItems.length > 8 ? 'down' : 'up',
      },
      {
        label: 'Critical Risk',
        value: String(criticalItems.length),
        trend: criticalItems.length > 3 ? 'down' : 'up',
      },
      {
        label: 'Inspections This Week',
        value: String(inspectionItems.length),
        trend: inspectionItems.length > 15 ? 'up' : 'down',
      },
      {
        label: 'Near Miss Reports',
        value: String(incidentItems.length),
        trend: incidentItems.length > 10 ? 'up' : 'down',
      },
    ]

    if (!showCriticalOnly) {
      return computedKpis
    }

    return computedKpis.filter((kpi) => kpi.label.includes('Critical'))
  }, [actionItems, showCriticalOnly])

  const capaSummary = useMemo(() => {
    const activeItems = actionItems.filter((item) => item.status !== 'Done')

    const enrichedItems = activeItems
      .map((item) => {
        const dueAt = parseMockActionDate(item.dueDate)

        return {
          ...item,
          dueAt,
        }
      })
      .sort((left, right) => {
        const leftRank = getPriorityRank(left.priority)
        const rightRank = getPriorityRank(right.priority)

        if (leftRank !== rightRank) {
          return leftRank - rightRank
        }

        if (left.dueAt && right.dueAt) {
          return left.dueAt.getTime() - right.dueAt.getTime()
        }

        if (left.dueAt) {
          return -1
        }

        if (right.dueAt) {
          return 1
        }

        return left.title.localeCompare(right.title)
      })

    const overdue = enrichedItems.filter((item) => isActionOverdue(item))
    const dueToday = enrichedItems.filter((item) => isActionDueToday(item))
    const dueSoon = enrichedItems.filter((item) => isActionDueSoon(item))
    const blocked = enrichedItems.filter((item) => item.status === 'Blocked')

    return {
      overdueCount: overdue.length,
      dueTodayCount: dueToday.length,
      dueSoonCount: dueSoon.length,
      blockedCount: blocked.length,
      spotlightItems: enrichedItems.slice(0, 4),
    }
  }, [actionItems])

  const sourceSummary = useMemo(() => {
    const sourceOrder: Array<ActionItem['source']> = ['Incident', 'Inspection', 'Audit']

    return sourceOrder.map((source) => {
      const items = actionItems.filter((item) => item.source === source)
      const activeItems = items.filter((item) => item.status !== 'Done')
      const overdueItems = activeItems.filter((item) => isActionOverdue(item))
      const averageProgress = items.length > 0 ? Math.round(items.reduce((total, item) => total + item.progress, 0) / items.length) : 0

      return {
        source,
        total: items.length,
        active: activeItems.length,
        overdue: overdueItems.length,
        averageProgress,
      }
    })
  }, [actionItems])

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-cyan-200/60 bg-[linear-gradient(120deg,#0f172a_0%,#134e4a_100%)] p-6 text-white shadow-lg md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Today</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Safety Command Center</h2>
            <p className="mt-2 text-sm text-cyan-100/85">Operational snapshot untuk prioritas aksi harian.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigate('/inspections?action=new')
                addToast('Navigasi ke form New Inspection.', 'emerald')
              }}
              className="rounded-xl border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              New Inspection
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/incidents?action=report&filter=Open')
                addToast('Navigasi ke halaman Incident report.', 'emerald')
              }}
              className="rounded-xl border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Report Incident
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/actions?action=focus&status=Open&priority=Critical')
                addToast('Navigasi ke tracker CAPA prioritas tinggi.', 'emerald')
              }}
              className="rounded-xl border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Open CAPA Tracker
            </button>
            <button
              type="button"
              onClick={() => {
                toggleCriticalOnly()
                addToast(showCriticalOnly ? 'Menampilkan semua KPI.' : 'Mode KPI critical-only aktif.', 'emerald')
              }}
              className="rounded-xl border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              {showCriticalOnly ? 'Show All KPI' : 'Show Critical Only'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <MetricCard key={kpi.label} label={kpi.label} value={kpi.value} trend={kpi.trend} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard
          title="CAPA Aging Monitor"
          rightSlot={
            <button
              type="button"
              onClick={() => {
                navigate('/actions?action=focus&status=Open')
                addToast('Membuka CAPA tracker untuk CAPA aktif.', 'emerald')
              }}
              className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 transition hover:bg-emerald-100"
            >
              Open Tracker
            </button>
          }
        >
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => {
                navigate('/actions?action=focus&focus=Overdue')
                addToast('Filter CAPA overdue dibuka.', 'emerald')
              }}
              className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left transition hover:border-rose-300 hover:bg-rose-100"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">Overdue</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{capaSummary.overdueCount}</p>
              <p className="mt-1 text-sm text-slate-600">CAPA melewati target due date.</p>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/actions?action=focus&focus=Due%20Today')
                addToast('Filter CAPA due today dibuka.', 'emerald')
              }}
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:border-amber-300 hover:bg-amber-100"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Due Today</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{capaSummary.dueTodayCount}</p>
              <p className="mt-1 text-sm text-slate-600">Perlu follow-up sebelum shift berakhir.</p>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/actions?action=focus&focus=Due%20Soon')
                addToast('Filter CAPA due soon dibuka.', 'emerald')
              }}
              className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-left transition hover:border-cyan-300 hover:bg-cyan-100"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Due in 48h</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{capaSummary.dueSoonCount}</p>
              <p className="mt-1 text-sm text-slate-600">CAPA yang masih bisa diamankan lebih awal.</p>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/actions?action=focus&status=Blocked')
                addToast('Filter CAPA blocked dibuka.', 'emerald')
              }}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-slate-100"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">Blocked</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{capaSummary.blockedCount}</p>
              <p className="mt-1 text-sm text-slate-600">Action item tertahan dan perlu eskalasi.</p>
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {capaSummary.spotlightItems.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => navigate(`/actions/${action.id}`)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-cyan-200 hover:bg-white"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{action.title}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge label={action.priority} tone={action.priority === 'Critical' ? 'rose' : action.priority === 'High' ? 'amber' : 'cyan'} />
                    <Badge label={action.status} tone={getStatusTone(action.status)} />
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-600">{action.id} • {action.area} • Owner: {action.owner}</p>
                <p className="text-sm text-slate-600">Due: {action.dueDate}</p>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="CAPA Source Mix" subtitle="Distribusi action item aktif per sumber temuan.">
          <div className="mt-4 space-y-3">
            {sourceSummary.map((item) => (
              <button
                key={item.source}
                type="button"
                onClick={() => {
                  navigate(`/actions?action=focus&aQ=${encodeURIComponent(item.source)}`)
                  addToast(`Menampilkan CAPA dari source ${item.source}.`, 'emerald')
                }}
                className="block w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-cyan-200 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{item.source}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{item.active} active</p>
                    <p className="mt-1 text-sm text-slate-600">{item.total} total action item dari source ini.</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Badge label={`${item.overdue} overdue`} tone={item.overdue > 0 ? 'rose' : 'emerald'} />
                    <Badge label={`${item.averageProgress}% progress`} tone="cyan" />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#0ea5e9_0%,#14b8a6_55%,#22c55e_100%)]"
                      style={{ width: `${item.averageProgress}%` }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <SectionCard title="Shift Safety Performance" rightSlot={<Badge label="Live" tone="cyan" />}>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-2 py-2 font-medium">Shift</th>
                  <th className="px-2 py-2 font-medium">Area</th>
                  <th className="px-2 py-2 font-medium">Checklist Completion</th>
                  <th className="px-2 py-2 font-medium">Incidents</th>
                </tr>
              </thead>
              <tbody>
                {shiftSummary.map((row) => (
                  <tr key={row.shift} className="border-b border-slate-100 last:border-none">
                    <td className="px-2 py-3 font-semibold text-slate-800">{row.shift}</td>
                    <td className="px-2 py-3 text-slate-700">{row.area}</td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-[linear-gradient(90deg,#0ea5e9_0%,#14b8a6_55%,#22c55e_100%)]" style={{ width: `${row.completion}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">{row.completion}%</span>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <Badge label={`${row.incidents}`} tone={row.incidents > 0 ? 'rose' : 'emerald'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Upcoming Inspections" subtitle="Agenda 24 jam berikutnya.">
          <div className="mt-4 space-y-3">
            {[
              { time: '09:30', area: 'Boiler Room', pic: 'Gibson' },
              { time: '11:00', area: 'Chemical Storage', pic: 'Baharuddin' },
              { time: '15:30', area: 'Packing Station', pic: 'Marusel' },
            ].map((item) => (
              <div key={item.time + item.area} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">{item.time}</p>
                <p className="mt-1 font-semibold text-slate-900">{item.area}</p>
                <p className="text-sm text-slate-600">PIC: {item.pic}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </section>
  )
}
