type MetricCardProps = {
  label: string
  value: string
  trend: 'up' | 'down'
}

export function MetricCard({ label, value, trend }: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      <p className={trend === 'down' ? 'mt-2 text-sm font-medium text-emerald-700' : 'mt-2 text-sm font-medium text-amber-700'}>
        {trend === 'down' ? 'Improving vs last week' : 'Needs monitoring'}
      </p>
    </article>
  )
}
