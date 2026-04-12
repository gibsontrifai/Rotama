export const inspectionsQueryKeys = {
  all: ['inspections'] as const,
  mock: () => [...inspectionsQueryKeys.all, 'mock'] as const,
}