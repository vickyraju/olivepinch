interface Segment {
  label: string
  value: number
  // Assigned by the caller from a fixed identity->color map, never by array position —
  // a segment must keep its color when a sibling category drops out of the data (e.g. a
  // narrower date range), not repaint because it shifted up the list.
  color: string
}

export function PartToWholeBar({ data, formatValue }: { data: Segment[]; formatValue: (v: number) => string }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) return null

  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded-md bg-gray-100 box-border">
        {data.map((d, i) => (
          <div
            key={d.label}
            className="box-border"
            style={{
              width: `${(d.value / total) * 100}%`,
              backgroundColor: d.color,
              borderRight: i < data.length - 1 ? "2px solid #f3f4f6" : undefined,
            }}
          />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="font-semibold text-gray-900">{d.label}</span>
            <span className="text-gray-500">
              {formatValue(d.value)} ({Math.round((d.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
