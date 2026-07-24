export const MAX_PAUSES_PER_MONTH = 4

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

export function computeEndDate(startDate: Date, planDuration: number, pausedDates: Date[]): Date {
  return addDays(startDate, planDuration - 1 + pausedDates.length)
}

export function pausesUsedThisMonth(pausedDates: Date[], now = new Date()): number {
  return pausedDates.filter((d) => d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth()).length
}

export function buildDeliveryDates(startDate: Date, planDuration: number, pausedDates: Date[]): Date[] {
  const totalDays = planDuration + pausedDates.length
  return Array.from({ length: totalDays }, (_, i) => addDays(startDate, i))
}
