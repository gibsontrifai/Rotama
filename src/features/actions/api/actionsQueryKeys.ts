export const actionsQueryKeys = {
  all: ['actions'] as const,
  mock: () => [...actionsQueryKeys.all, 'mock'] as const,
}