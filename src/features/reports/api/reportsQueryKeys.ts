export const reportsQueryKeys = {
  all: ['reports'] as const,
  dataset: () => [...reportsQueryKeys.all, 'dataset'] as const,
}