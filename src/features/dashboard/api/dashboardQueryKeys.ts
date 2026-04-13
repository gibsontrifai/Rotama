export const dashboardQueryKeys = {
  summary: (snapshotLabel = 'seed-2026-04', spotlightLimit = 4) => ['dashboard', 'summary', snapshotLabel, spotlightLimit] as const,
}
