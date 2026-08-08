function Sparkline({ points: entries, width = 240, height = 72 }: { points: { date: string; value: number }[]; width?: number; height?: number }) {
  if (entries.length < 2) {
    return <div style={{ height }} className="flex items-center text-xs text-ink-muted">Log more entries to see a trend.</div>
  }
  const values = entries.map((e) => e.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const chartHeight = height - 20
  const step = width / (values.length - 1)
  const y = (v: number) => chartHeight - ((v - min) / range) * (chartHeight - 8) - 4
  const points = values.map((v, i) => `${i * step},${y(v)}`).join(" ")
  const first = entries[0]
  const last = entries[entries.length - 1]
  const delta = last.value - first.value

  return (
    <div>
      <svg width={width} height={chartHeight} viewBox={`0 0 ${width} ${chartHeight}`} role="img" aria-label={`Weight trend from ${first.value}kg to ${last.value}kg`}>
        <polyline points={points} fill="none" stroke="var(--color-olive-500)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {values.map((v, i) => (
          <circle key={i} cx={i * step} cy={y(v)} r={3} fill="var(--color-coral-500)" />
        ))}
      </svg>
      <div className="flex items-center justify-between mt-2 text-xs text-ink-muted">
        <span>{new Date(first.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {first.value}kg</span>
        <span className="font-medium text-ink">{delta === 0 ? "No change" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}kg`}</span>
        <span>{new Date(last.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {last.value}kg</span>
      </div>
    </div>
  )
}

export { Sparkline }
