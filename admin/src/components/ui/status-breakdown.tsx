interface StatusBreakdownProps {
  rows: { label: string; count: number }[]
  emptyLabel?: string
}

// The categorical sibling of dashboard.tsx's MiniTrend — a labeled mini bar list for
// showing how a total splits across a small set of categories (status, zone, etc.).
function StatusBreakdown({ rows, emptyLabel = "No data yet." }: StatusBreakdownProps) {
  const max = Math.max(...rows.map((r) => r.count), 1)
  if (rows.length === 0) return <p className="text-sm text-ink-muted">{emptyLabel}</p>
  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-xs text-ink-muted truncate">{row.label}</span>
          <div className="flex-1 h-2 rounded-full bg-canvas overflow-hidden">
            <div className="h-full rounded-full bg-olive-300" style={{ width: `${(row.count / max) * 100}%` }} />
          </div>
          <span className="w-6 shrink-0 text-xs font-semibold text-ink text-right tabular-nums">{row.count}</span>
        </div>
      ))}
    </div>
  )
}

export { StatusBreakdown }
