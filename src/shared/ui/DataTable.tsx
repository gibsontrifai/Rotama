import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type DataTableColumn<T> = {
  key: string
  header: string
  headerClassName?: string
  cellClassName?: string
  cell: (row: T) => ReactNode
  sortable?: boolean
  sortValue?: (row: T) => string | number
}

type DataTableProps<T> = {
  rows: T[]
  columns: Array<DataTableColumn<T>>
  rowKey: (row: T) => string
  emptyMessage?: string
  minWidthClassName?: string
  searchConfig?: {
    enabled?: boolean
    placeholder?: string
    getSearchText: (row: T) => string
  }
  paginationConfig?: {
    enabled?: boolean
    initialPageSize?: number
    pageSizeOptions?: number[]
  }
  exportConfig?: {
    enabled?: boolean
    fileName?: string
    headers: string[]
    getRow: (row: T) => Array<string | number>
  }
  controlledState?: {
    searchTerm: string
    sortKey: string | null
    sortDirection: SortDirection
    currentPage: number
    pageSize: number
  }
  onControlledStateChange?: (nextState: {
    searchTerm: string
    sortKey: string | null
    sortDirection: SortDirection
    currentPage: number
    pageSize: number
  }) => void
}

type SortDirection = 'asc' | 'desc'

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  emptyMessage = 'No data available.',
  minWidthClassName = 'min-w-[620px]',
  searchConfig,
  paginationConfig,
  exportConfig,
  controlledState,
  onControlledStateChange,
}: DataTableProps<T>) {
  const [internalActiveSortKey, setInternalActiveSortKey] = useState<string | null>(null)
  const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>('asc')
  const [internalSearchTerm, setInternalSearchTerm] = useState('')

  const pageSizeOptions = paginationConfig?.pageSizeOptions ?? [5, 10, 20]
  const defaultPageSize = paginationConfig?.initialPageSize ?? pageSizeOptions[0] ?? 10
  const [internalPageSize, setInternalPageSize] = useState(defaultPageSize)
  const [internalCurrentPage, setInternalCurrentPage] = useState(1)

  const isControlled = Boolean(controlledState && onControlledStateChange)

  const searchTerm = isControlled ? (controlledState?.searchTerm ?? '') : internalSearchTerm
  const activeSortKey = isControlled ? (controlledState?.sortKey ?? null) : internalActiveSortKey
  const sortDirection = isControlled ? (controlledState?.sortDirection ?? 'asc') : internalSortDirection
  const pageSize = isControlled ? (controlledState?.pageSize ?? defaultPageSize) : internalPageSize
  const currentPage = isControlled ? (controlledState?.currentPage ?? 1) : internalCurrentPage

  const updateState = (partial: Partial<NonNullable<DataTableProps<T>['controlledState']>>) => {
    if (isControlled && controlledState && onControlledStateChange) {
      onControlledStateChange({ ...controlledState, ...partial })
      return
    }

    if (partial.searchTerm !== undefined) {
      setInternalSearchTerm(partial.searchTerm)
    }

    if (partial.sortKey !== undefined) {
      setInternalActiveSortKey(partial.sortKey)
    }

    if (partial.sortDirection !== undefined) {
      setInternalSortDirection(partial.sortDirection)
    }

    if (partial.currentPage !== undefined) {
      setInternalCurrentPage(partial.currentPage)
    }

    if (partial.pageSize !== undefined) {
      setInternalPageSize(partial.pageSize)
    }
  }

  const filteredRows = useMemo(() => {
    const searchEnabled = searchConfig?.enabled ?? false

    if (!searchEnabled || !searchTerm.trim() || !searchConfig?.getSearchText) {
      return rows
    }

    const loweredQuery = searchTerm.toLowerCase()

    return rows.filter((row) => searchConfig.getSearchText(row).toLowerCase().includes(loweredQuery))
  }, [rows, searchConfig, searchTerm])

  const sortedRows = useMemo(() => {
    if (!activeSortKey) {
      return filteredRows
    }

    const activeColumn = columns.find((column) => column.key === activeSortKey)

    if (!activeColumn?.sortable || !activeColumn.sortValue) {
      return filteredRows
    }

    const sorted = [...filteredRows].sort((firstRow, secondRow) => {
      const firstValue = activeColumn.sortValue?.(firstRow)
      const secondValue = activeColumn.sortValue?.(secondRow)

      if (typeof firstValue === 'number' && typeof secondValue === 'number') {
        return firstValue - secondValue
      }

      return String(firstValue).localeCompare(String(secondValue), undefined, { numeric: true, sensitivity: 'base' })
    })

    return sortDirection === 'asc' ? sorted : sorted.reverse()
  }, [activeSortKey, columns, filteredRows, sortDirection])

  const paginationEnabled = paginationConfig?.enabled ?? false
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / Math.max(1, pageSize)))
  const safePage = Math.min(currentPage, totalPages)

  const paginatedRows = useMemo(() => {
    if (!paginationEnabled) {
      return sortedRows
    }

    const startIndex = (safePage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return sortedRows.slice(startIndex, endIndex)
  }, [pageSize, paginationEnabled, safePage, sortedRows])

  const toggleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable) {
      return
    }

    if (activeSortKey !== column.key) {
      updateState({ sortKey: column.key, sortDirection: 'asc' })
      return
    }

    updateState({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc' })
  }

  const getSortIndicator = (column: DataTableColumn<T>) => {
    if (!column.sortable) {
      return null
    }

    if (activeSortKey !== column.key) {
      return '↕'
    }

    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const downloadCsv = () => {
    if (!exportConfig?.enabled) {
      return
    }

    const escapeCell = (value: string | number) => {
      const text = String(value)
      const escaped = text.replace(/"/g, '""')
      return `"${escaped}"`
    }

    const lines = [
      exportConfig.headers.map((header) => escapeCell(header)).join(','),
      ...sortedRows.map((row) => exportConfig.getRow(row).map((cell) => escapeCell(cell)).join(',')),
    ]

    const csvContent = lines.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = exportConfig.fileName ?? 'table-export.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      {searchConfig?.enabled || exportConfig?.enabled ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3">
            {searchConfig?.enabled ? (
              <input
                value={searchTerm}
                onChange={(event) => {
                  updateState({ searchTerm: event.target.value, currentPage: 1 })
                }}
                placeholder={searchConfig.placeholder ?? 'Search table...'}
                className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-cyan-200 transition focus:ring"
              />
            ) : null}
            {searchConfig?.enabled ? <p className="text-xs text-slate-500">{filteredRows.length} results</p> : null}
          </div>
          {exportConfig?.enabled ? (
            <button
              type="button"
              onClick={downloadCsv}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
            >
              Export CSV
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className={`w-full ${minWidthClassName} border-collapse text-sm`}>
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              {columns.map((column) => (
                <th key={column.key} className={`px-2 py-2 font-medium ${column.headerClassName ?? ''}`.trim()}>
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column)}
                      className="inline-flex items-center gap-1 text-left transition hover:text-slate-700"
                    >
                      <span>{column.header}</span>
                      <span className="text-xs text-slate-400">{getSortIndicator(column)}</span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-2 py-6 text-center text-sm text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => (
                <tr key={rowKey(row)} className="border-b border-slate-100 last:border-none">
                  {columns.map((column) => (
                    <td key={column.key} className={`px-2 py-3 ${column.cellClassName ?? ''}`.trim()}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {paginationEnabled ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(event) => {
                updateState({ pageSize: Number(event.target.value), currentPage: 1 })
              }}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateState({ currentPage: Math.max(1, safePage - 1) })}
              disabled={safePage <= 1}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm text-slate-600">
              Page {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => updateState({ currentPage: Math.min(totalPages, safePage + 1) })}
              disabled={safePage >= totalPages}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}