export type OrderStatus = "Scheduled" | "Out for Delivery" | "Delivered" | "Attempted" | "Paused"

export interface OrderDay {
  date: string
  status: OrderStatus
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
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

export function pausesUsedThisMonth(pausedDates: string[]): number {
  const now = new Date()
  return pausedDates.filter((d) => {
    const date = new Date(d)
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  }).length
}

export const MAX_PAUSES_PER_MONTH = 4
