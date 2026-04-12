import type { ReactNode } from 'react'

type ModalProps = {
  isOpen: boolean
  title: string
  subtitle?: string
  children: ReactNode
  onClose: () => void
  widthClassName?: string
}

export function Modal({ isOpen, title, subtitle, children, onClose, widthClassName = 'max-w-md' }: ModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 p-4">
      <div className={`w-full rounded-2xl border border-white/80 bg-white p-5 shadow-xl ${widthClassName}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600"
          >
            Close
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}