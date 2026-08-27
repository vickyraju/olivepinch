import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  // Monday-first offset
  const leadingBlanks = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = Array(leadingBlanks).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  return cells
}

export interface CalendarProps {
  minDate: Date
  maxDate?: Date
  selected: Date | null
  onSelect: (date: Date) => void
}

function Calendar({ minDate, maxDate, selected, onSelect }: CalendarProps) {
  const min = startOfDay(minDate)
  const max = maxDate ? startOfDay(maxDate) : undefined
  const [viewDate, setViewDate] = useState(new Date(min.getFullYear(), min.getMonth(), 1))

  const cells = buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth())
  const monthLabel = viewDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })

  const goPrevDisabled = viewDate.getFullYear() === min.getFullYear() && viewDate.getMonth() === min.getMonth()
  const goNextDisabled = !!max && viewDate.getFullYear() === max.getFullYear() && viewDate.getMonth() === max.getMonth()

  return (
    <div className="rounded-xl border border-border bg-surface p-4 w-full max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          aria-label="Previous month"
          disabled={goPrevDisabled}
          onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-cream-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-display font-semibold text-ink">{monthLabel}</span>
        <button
          type="button"
          aria-label="Next month"
          disabled={goNextDisabled}
          onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-cream-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-xs font-medium text-ink-muted py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />
          const disabled = date < min || (max ? date > max : false)
          const isSelected = selected && startOfDay(selected).getTime() === date.getTime()
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(date)}
              aria-pressed={!!isSelected}
              aria-label={date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              className={cn(
                "h-10 w-10 rounded-full text-sm font-medium transition-colors cursor-pointer",
                disabled && "text-ink-muted/40 cursor-not-allowed",
                !disabled && !isSelected && "text-ink hover:bg-olive-50",
                isSelected && "bg-coral-500 text-white"
              )}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { Calendar }
