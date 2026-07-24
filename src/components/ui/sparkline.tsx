function Sparkline({ values, width = 240, height = 64 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) {
    return <div style={{ height }} className="flex items-center text-xs text-ink-muted">Log more entries to see a trend.</div>
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = width / (values.length - 1)
  const points = values
    .map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 8) - 4}`)
    .join(" ")

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Weight trend over time">
      <polyline points={points} fill="none" stroke="var(--color-olive-500)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={i * step} cy={height - ((v - min) / range) * (height - 8) - 4} r={3} fill="var(--color-coral-500)" />
      ))}
    </svg>
  )
}

export { Sparkline }
