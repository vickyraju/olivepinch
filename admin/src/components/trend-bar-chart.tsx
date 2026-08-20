import { useMemo, useRef, useState } from "react"

interface TrendPoint {
  label: string
  value: number
}

interface TrendBarChartProps {
  data: TrendPoint[]
  formatValue: (value: number) => string
  color?: string
  height?: number
}

const WIDTH = 600
const PADDING_TOP = 16
const PADDING_BOTTOM = 24
const PADDING_X = 8
const BAR_GAP_RATIO = 0.35

/** Rounds a max value up to a "clean" tick ceiling (e.g. 1,340 -> 1,500; 82 -> 100). */
function niceCeiling(max: number): number {
  if (max <= 0) return 10
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
  const normalized = max / magnitude
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return niceNormalized * magnitude
}

export function TrendBarChart({ data, formatValue, color = "#418A56", height = 240 }: TrendBarChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const { bars, plotHeight } = useMemo(() => {
    const plotHeight = height - PADDING_TOP - PADDING_BOTTOM
    const maxValue = Math.max(...data.map((d) => d.value), 0)
    const yMax = niceCeiling(maxValue)
    const plotWidth = WIDTH - PADDING_X * 2
    const slot = data.length > 0 ? plotWidth / data.length : 0
    const barWidth = slot * (1 - BAR_GAP_RATIO)

    const bars = data.map((d, i) => {
      const barHeight = yMax === 0 ? 0 : (d.value / yMax) * plotHeight
      return {
        x: PADDING_X + slot * i + (slot - barWidth) / 2,
        y: PADDING_TOP + plotHeight - barHeight,
        width: barWidth,
        height: barHeight,
        centerX: PADDING_X + slot * i + slot / 2,
        ...d,
      }
    })

    return { bars, plotHeight }
  }, [data, height])

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!svgRef.current || bars.length === 0) return
    const rect = svgRef.current.getBoundingClientRect()
    const relativeX = ((e.clientX - rect.left) / rect.width) * WIDTH
    let nearest = 0
    let nearestDist = Infinity
    bars.forEach((b, i) => {
      const dist = Math.abs(b.centerX - relativeX)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = i
      }
    })
    setHoverIndex(nearest)
  }

  const hovered = hoverIndex !== null ? bars[hoverIndex] : null
  const gridLines = [0, 0.5, 1]

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {gridLines.map((frac) => {
          const y = PADDING_TOP + plotHeight * (1 - frac)
          return (
            <line
              key={frac}
              x1={PADDING_X}
              x2={WIDTH - PADDING_X}
              y1={y}
              y2={y}
              stroke="#E5E7EB"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )
        })}

        {bars.map((b, i) => (
          <rect
            key={i}
            x={b.x}
            y={b.y}
            width={Math.max(b.width, 0)}
            height={Math.max(b.height, 0)}
            rx={2}
            fill={color}
            opacity={hoverIndex === null || hoverIndex === i ? 1 : 0.45}
          />
        ))}
      </svg>

      <div className="flex text-[11px] text-gray-400 mt-1 px-1">
        {data.map((d, i) => (
          <span key={d.label} className="flex-1 text-center truncate" style={{ opacity: i % Math.ceil(data.length / 10 || 1) === 0 ? 1 : 0 }}>
            {d.label}
          </span>
        ))}
      </div>

      {hovered ? (
        <div
          className="absolute bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-lg -translate-x-1/2"
          style={{
            left: `${(hovered.centerX / WIDTH) * 100}%`,
            top: Math.max(hovered.y - 56, 0),
          }}
        >
          <p className="font-semibold">{formatValue(hovered.value)}</p>
          <p className="text-gray-300">{hovered.label}</p>
        </div>
      ) : null}
    </div>
  )
}
