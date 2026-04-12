import { useMutation } from '@tanstack/react-query'
import { exportReportMock, type ExportTarget } from './reportsApi'

export function useExportReportMutation() {
  return useMutation({
    mutationFn: (target: ExportTarget) => exportReportMock(target),
  })
}