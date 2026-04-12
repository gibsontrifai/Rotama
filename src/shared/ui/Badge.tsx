type BadgeTone = 'rose' | 'amber' | 'emerald' | 'cyan' | 'slate'

type BadgeProps = {
  label: string
  tone?: BadgeTone
  className?: string
}

const toneClassMap: Record<BadgeTone, string> = {
  rose: 'bg-rose-100 text-rose-700',
  amber: 'bg-amber-100 text-amber-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  slate: 'bg-slate-100 text-slate-700',
}

export function Badge({ label, tone = 'slate', className = '' }: BadgeProps) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneClassMap[tone]} ${className}`.trim()}>
      {label}
    </span>
  )
}
