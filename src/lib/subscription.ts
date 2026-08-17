export type OrderStatus = "Scheduled" | "Out for Delivery" | "Delivered" | "Attempted" | "Paused"

export interface OrderDay {
  date: string
  status: OrderStatus
}

// toISOString() converts to UTC before formatting, which silently shifts the date for
// any timezone ahead of UTC (e.g. IST) — always read/write date keys via local calendar
// components instead, so a date never crosses a day boundary just from serializing it.
export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function addDays(iso: string, days: number): string {
  const d = fromDateKey(iso)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

function todayIso(): string {
  return toDateKey(new Date())
}

export function computeEndDate(startDate: string, planDuration: number, pausedDates: string[]): string {
  return addDays(startDate, planDuration - 1 + pausedDates.length)
}

export function buildOrderDays(startDate: string, planDuration: number, pausedDates: string[]): OrderDay[] {
  const paused = new Set(pausedDates)
  const today = todayIso()
  const totalDays = planDuration + pausedDates.length
  const days: OrderDay[] = []
  for (let i = 0; i < totalDays; i++) {
    const date = addDays(startDate, i)
    if (paused.has(date)) {
      days.push({ date, status: "Paused" })
      continue
    }
    if (date < today) days.push({ date, status: "Delivered" })
    else if (date === today) days.push({ date, status: "Out for Delivery" })
    else days.push({ date, status: "Scheduled" })
  }
  return days
}

// Monday of the calendar week containing this date — the shared business-wide weekly
// menu cycle boundary. Stays in local calendar components throughout (no UTC mixing),
// same reasoning as toDateKey/fromDateKey above.
export function mondayOf(dateKey: string): string {
  const d = fromDateKey(dateKey)
  const day = d.getDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toDateKey(d)
}

export function addWeeks(dateKey: string, weeks: number): string {
  return addDays(dateKey, weeks * 7)
}

export function pausesUsedThisMonth(pausedDates: string[]): number {
  const now = new Date()
  return pausedDates.filter((d) => {
    const date = fromDateKey(d)
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  }).length
}

export const MAX_PAUSES_PER_MONTH = 4
