export const incidentsQueryKeys = {
  all: ['incidents'] as const,
  mock: () => [...incidentsQueryKeys.all, 'mock'] as const,
}