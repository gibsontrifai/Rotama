import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useConfirmAction } from '../../../shared/hooks/useConfirmAction'
import { useQueryParamBoolean } from '../../../shared/hooks/useQueryParamBoolean'
import { useQueryParamEnum } from '../../../shared/hooks/useQueryParamEnum'
import { useQueryParamList } from '../../../shared/hooks/useQueryParamList'
import { useQueryParamNumber } from '../../../shared/hooks/useQueryParamNumber'
import { useQueryParamString } from '../../../shared/hooks/useQueryParamString'
import { useToastStore } from '../../../shared/store/useToastStore'
import { Badge, ConfirmActionModal, DataTable, MetricCard, SectionCard } from '../../../shared/ui'
import { createTableQueryParamKeys } from '../../../shared/utils/createTableQueryParamKeys'
import { fetchReportsDatasetMock, type ExportTarget, type FocusMetric, type TrendPeriod } from '../api/reportsApi'
import { useExportReportMutation, useUpdateFocusMetricsMutation } from '../api/reportsMutations'
import { reportsQueryKeys } from '../api/reportsQueryKeys'

const periodValues = ['30d', '90d', 'ytd'] as const
const tableSortValues = ['area', 'inspections', 'incidents', 'compliance'] as const
type TableSortKey = (typeof tableSortValues)[number]
const tableQueryKeys = createTableQueryParamKeys('tbl')

export function ReportsPage() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((state) => state.addToast)
  const exportConfirm = useConfirmAction<ExportTarget>()
  const exportReportMutation = useExportReportMutation()
  const updateFocusMetricsMutation = useUpdateFocusMetricsMutation()
  const { data: reportsDataset, isLoading, isError } = useQuery({
    queryKey: reportsQueryKeys.dataset(),
    queryFn: fetchReportsDatasetMock,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  const areaSafetyRows = useMemo(() => reportsDataset?.areaSafetyRows ?? [], [reportsDataset])
  const trendByAreaAndPeriod: Record<string, Record<TrendPeriod, number[]>> =
    reportsDataset?.trendByAreaAndPeriod ?? { 'All Areas': { '30d': [], '90d': [], ytd: [] } }
  const allFocusMetrics = useMemo(() => reportsDataset?.allFocusMetrics ?? [], [reportsDataset])
  const allowedAreas = useMemo(() => ['All Areas', ...areaSafetyRows.map((row) => row.area)], [areaSafetyRows])

  const { value: period, setValue: setPeriod } = useQueryParamEnum<TrendPeriod>({
    key: 'period',
    values: periodValues,
    defaultValue: '30d',
  })

  const { value: area, setValue: setArea } = useQueryParamEnum<string>({
    key: 'area',
    values: allowedAreas,
    defaultValue: 'All Areas',
  })

  const { values: focusMetrics, setValues: setFocusMetrics } = useQueryParamList<FocusMetric>({
    key: 'metrics',
    values: allFocusMetrics,
    defaultValues: allFocusMetrics,
  })

  const { value: tableSearchTerm, setValue: setTableSearchTerm } = useQueryParamString({
    key: tableQueryKeys.search,
    defaultValue: '',
  })
  const { value: tableSortKey, setValue: setTableSortKey } = useQueryParamEnum<TableSortKey>({
    key: tableQueryKeys.sort,
    values: tableSortValues,
    defaultValue: 'area',
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
    defaultValue: 2,
    min: 2,
    max: 20,
  })

  const resetTableState = () => {
    setTableSearchTerm('')
    setTableSortKey('area')
    setTableSortDesc(false)
    setTablePage(1)
    setTablePageSize(2)
  }

  const visibleRows = useMemo(() => {
    if (area === 'All Areas') {
      return areaSafetyRows
    }

    return areaSafetyRows.filter((row) => row.area === area)
  }, [area, areaSafetyRows])

  const trendValues = trendByAreaAndPeriod[area]?.[period] ?? trendByAreaAndPeriod['All Areas'][period]

  const reportMetrics = useMemo(() => {
    const totalInspections = visibleRows.reduce((sum, row) => sum + row.inspections, 0)
    const openIncidents = visibleRows.reduce((sum, row) => sum + row.incidents, 0)
    const totalCapa = visibleRows.reduce((sum, row) => sum + row.capa, 0)
    const avgCompliance = visibleRows.length
      ? Math.round(visibleRows.reduce((sum, row) => sum + row.compliance, 0) / visibleRows.length)
      : 0

    const selectedNearMiss = visibleRows.reduce((sum, row) => sum + row.nearMiss, 0)
    const avgTrir = visibleRows.length
      ? (visibleRows.reduce((sum, row) => sum + row.trir, 0) / visibleRows.length).toFixed(1)
      : '0.0'

    return [
      { label: 'Total Inspections', value: `${totalInspections}`, trend: 'up' as const },
      { label: 'Open Incidents', value: `${openIncidents}`, trend: openIncidents > 5 ? ('down' as const) : ('up' as const) },
      {
        label: focusMetrics.includes('CAPA') ? 'Corrective Actions' : 'Near Miss',
        value: focusMetrics.includes('CAPA') ? `${totalCapa}` : `${selectedNearMiss}`,
        trend: 'up' as const,
      },
      {
        label: focusMetrics.includes('TRIR') ? 'TRIR (Avg)' : 'Compliance Score',
        value: focusMetrics.includes('TRIR') ? avgTrir : `${avgCompliance}%`,
        trend: 'up' as const,
      },
    ]
  }, [focusMetrics, visibleRows])

  const runExport = async () => {
    if (!exportConfirm.target) {
      return
    }

    const exportedTarget = await exportReportMutation.mutateAsync(exportConfirm.target)
    addToast(`Report ${exportedTarget.toUpperCase()} berhasil diproses.`, 'emerald')
    exportConfirm.close()
  }

  const updateFocusMetrics = async (metric: FocusMetric) => {
    const nextMetrics = focusMetrics.includes(metric)
      ? focusMetrics.filter((item) => item !== metric)
      : [...focusMetrics, metric]

    if (nextMetrics.length === 0) {
      return
    }

    try {
      const nextDataset = await updateFocusMetricsMutation.mutateAsync(nextMetrics)
      queryClient.setQueryData(reportsQueryKeys.dataset(), nextDataset)
      setFocusMetrics(nextDataset.allFocusMetrics)
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Gagal memperbarui focus metrics.', 'rose')
    }
  }

  return (
    <section className="space-y-6">
      {isLoading ? (
        <SectionCard>
          <p className="text-sm text-slate-600">Loading reports data...</p>
        </SectionCard>
      ) : null}

      {isError ? (
        <SectionCard>
          <p className="text-sm text-rose-700">Failed to load reports data. Please refresh the page.</p>
        </SectionCard>
      ) : null}

      <header className="rounded-2xl border border-indigo-200/50 bg-[linear-gradient(120deg,#eef2ff_0%,#ecfeff_45%,#f8fafc_100%)] p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-700">Reports & Analytics</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Safety Performance Reports</h2>
            <p className="mt-1 text-slate-600">Ringkasan KPI dan performa K3 untuk kebutuhan monitoring manajemen.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportConfirm.open('pdf')}
              className="rounded-xl border border-indigo-300 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={() => exportConfirm.open('excel')}
              className="rounded-xl border border-cyan-300 bg-white px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
            >
              Export Excel
            </button>
          </div>
        </div>
      </header>

      <SectionCard>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {reportMetrics.map((metric) => (
            <MetricCard key={metric.label} label={metric.label} value={metric.value} trend={metric.trend} />
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <SectionCard title="Monthly Incident Trend" subtitle="Perbandingan incident 6 bulan terakhir.">
          <div className="mt-4 grid grid-cols-6 items-end gap-3">
            {trendValues.map((value, index) => (
              <div key={`trend-month-${index}`} className="space-y-2 text-center">
                <div className="mx-auto flex h-36 w-10 items-end rounded-xl bg-slate-100 p-1">
                  <div
                    className="w-full rounded-lg bg-[linear-gradient(180deg,#6366f1_0%,#0ea5e9_100%)]"
                    style={{ height: `${Math.max(value * 4, 16)}px` }}
                  />
                </div>
                <p className="text-xs font-medium text-slate-500">M{index + 1}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Report Filters" subtitle="Atur periode dan segmentasi data.">
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Period</span>
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value as TrendPeriod)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="ytd">Year to Date</option>
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Area</span>
              <select value={area} onChange={(event) => setArea(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                <option>All Areas</option>
                <option>Warehouse</option>
                <option>Production</option>
                <option>Utilities</option>
                <option>Loading Bay</option>
              </select>
            </label>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-800">Focus Metrics</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {allFocusMetrics.map((metric) => {
                  const active = focusMetrics.includes(metric)

                  return (
                    <button
                      key={metric}
                      type="button"
                      onClick={() => void updateFocusMetrics(metric)}
                      className={
                        active
                          ? 'rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white'
                          : 'rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700'
                      }
                    >
                      {metric}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Area Safety Snapshot" subtitle="Ringkasan performa K3 per area operasional.">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={resetTableState}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
          >
            Reset Table State
          </button>
        </div>
        <DataTable
          rows={visibleRows}
          rowKey={(row) => row.area}
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
            placeholder: 'Search area, inspections, incidents, or compliance...',
            getSearchText: (row) => `${row.area} ${row.inspections} ${row.incidents} ${row.compliance}`,
          }}
          paginationConfig={{
            enabled: true,
            initialPageSize: 2,
            pageSizeOptions: [2, 4, 8],
          }}
          exportConfig={{
            enabled: true,
            fileName: 'area-safety-snapshot.csv',
            headers: ['Area', 'Inspections', 'Incidents', 'Compliance'],
            getRow: (row) => [row.area, row.inspections, row.incidents, `${row.compliance}%`],
          }}
          columns={[
            {
              key: 'area',
              header: 'Area',
              cellClassName: 'font-semibold text-slate-800',
              sortable: true,
              sortValue: (row) => row.area,
              cell: (row) => row.area,
            },
            {
              key: 'inspections',
              header: 'Inspections',
              cellClassName: 'text-slate-700',
              sortable: true,
              sortValue: (row) => row.inspections,
              cell: (row) => row.inspections,
            },
            {
              key: 'incidents',
              header: 'Incidents',
              cellClassName: 'text-slate-700',
              sortable: true,
              sortValue: (row) => row.incidents,
              cell: (row) => row.incidents,
            },
            {
              key: 'compliance',
              header: 'Compliance',
              sortable: true,
              sortValue: (row) => row.compliance,
              cell: (row) => <Badge label={`${row.compliance}%`} tone="cyan" />,
            },
          ]}
        />
      </SectionCard>

      <ConfirmActionModal
        isOpen={exportConfirm.isOpen}
        title={exportConfirm.target === 'excel' ? 'Export Excel Report' : 'Export PDF Report'}
        message="Lanjutkan proses export berdasarkan filter aktif saat ini?"
        confirmLabel="Export Now"
        isSubmitting={exportReportMutation.isPending}
        onCancel={exportConfirm.close}
        onConfirm={() => void runExport()}
      />
    </section>
  )
}
