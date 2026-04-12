import type { ReactNode } from 'react'

type SectionCardProps = {
  title?: string
  subtitle?: string
  rightSlot?: ReactNode
  children: ReactNode
  className?: string
}

export function SectionCard({ title, subtitle, rightSlot, children, className = '' }: SectionCardProps) {
  return (
    <article className={`rounded-2xl border border-white/70 bg-white p-5 shadow-sm ${className}`.trim()}>
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          {rightSlot}
        </div>
      ) : null}
      {children}
    </article>
  )
}
