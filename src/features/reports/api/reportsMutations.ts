import { useMutation } from '@tanstack/react-query'
import {
  exportReportMock,
  updateFocusMetricsMock,
  type ExportTarget,
  type FocusMetric,
} from './reportsApi'

export function useExportReportMutation() {
  return useMutation({
    mutationFn: (target: ExportTarget) => exportReportMock(target),
  })
}

export function useUpdateFocusMetricsMutation() {
  return useMutation({
    mutationFn: (metrics: FocusMetric[]) => updateFocusMetricsMock(metrics),
  })
}