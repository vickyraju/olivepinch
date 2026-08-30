// Fixed categorical palette (blue/orange/aqua/yellow), assigned by category identity —
// never by sort rank, so a segment's color stays put as the underlying counts shift.
// Passes the dataviz skill's CVD/contrast validator for 4-slot categorical use.
const CATEGORY_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#898781"]

interface Segment {
  label: string
  value: number
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
              backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
              borderRight: i < data.length - 1 ? "2px solid #f3f4f6" : undefined,
            }}
          />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
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
