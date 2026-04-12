type ToastItem = {
  id: number
  message: string
  tone: 'emerald' | 'rose'
}

type ToastStackProps = {
  toasts: ToastItem[]
}

export function ToastStack({ toasts }: ToastStackProps) {
  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="fixed right-4 top-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={
            toast.tone === 'emerald'
              ? 'rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 shadow-sm'
              : 'rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800 shadow-sm'
          }
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}