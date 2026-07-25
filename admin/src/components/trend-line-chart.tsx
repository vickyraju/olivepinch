import { useMemo, useRef, useState } from "react"

interface TrendPoint {
  label: string
  value: number
}

interface TrendLineChartProps {
  data: TrendPoint[]
  formatValue: (value: number) => string
  color?: string
  height?: number
}

const WIDTH = 600
const PADDING_TOP = 16
const PADDING_BOTTOM = 24
const PADDING_X = 8

/** Rounds a max value up to a "clean" tick ceiling (e.g. 1,340 -> 1,500; 82 -> 100). */
function niceCeiling(max: number): number {
  if (max <= 0) return 10
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
  const normalized = max / magnitude
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return niceNormalized * magnitude
}

export function TrendLineChart({ data, formatValue, color = "#418A56", height = 240 }: TrendLineChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const { points, plotHeight } = useMemo(() => {
    const plotHeight = height - PADDING_TOP - PADDING_BOTTOM
    const maxValue = Math.max(...data.map((d) => d.value), 0)
    const yMax = niceCeiling(maxValue)
    const plotWidth = WIDTH - PADDING_X * 2
    const step = data.length > 1 ? plotWidth / (data.length - 1) : 0

    const points = data.map((d, i) => ({
      x: PADDING_X + step * i,
      y: PADDING_TOP + plotHeight - (yMax === 0 ? 0 : (d.value / yMax) * plotHeight),
      ...d,
    }))

    return { points, plotHeight }
  }, [data, height])

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!svgRef.current || points.length === 0) return
    const rect = svgRef.current.getBoundingClientRect()
    const relativeX = ((e.clientX - rect.left) / rect.width) * WIDTH
    let nearest = 0
    let nearestDist = Infinity
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relativeX)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = i
      }
    })
    setHoverIndex(nearest)
  }

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1].x},${PADDING_TOP + plotHeight} L${points[0].x},${PADDING_TOP + plotHeight} Z`
      : ""

  const hovered = hoverIndex !== null ? points[hoverIndex] : null
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

        {areaPath ? <path d={areaPath} fill={color} opacity={0.1} /> : null}
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

        {points.length > 0 ? (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r={4}
            fill={color}
            stroke="white"
            strokeWidth={2}
          />
        ) : null}

        {hovered ? (
          <>
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={PADDING_TOP}
              y2={PADDING_TOP + plotHeight}
              stroke="#9CA3AF"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={hovered.x} cy={hovered.y} r={4} fill={color} stroke="white" strokeWidth={2} />
          </>
        ) : null}
      </svg>

      {points.length > 0 ? (
        <span className="absolute text-[11px] font-semibold text-gray-700" style={{ right: 4, top: points[points.length - 1].y - 20 }}>
          {formatValue(points[points.length - 1].value)}
        </span>
      ) : null}

      <div className="flex justify-between text-[11px] text-gray-400 mt-1 px-1">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>

      {hovered ? (
        <div
          className="absolute bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-lg -translate-x-1/2"
          style={{
            left: `${(hovered.x / WIDTH) * 100}%`,
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
