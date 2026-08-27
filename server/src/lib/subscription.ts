// Lifetime pause budget per subscription, scaled by plan length (not a monthly allowance).
export const PAUSE_LIMITS_BY_DURATION: Record<7 | 14 | 28, number> = { 7: 0, 14: 2, 28: 4 }

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

export function computeEndDate(startDate: Date, planDuration: number, pausedDates: Date[]): Date {
  return addDays(startDate, planDuration - 1 + pausedDates.length)
}

export function pausesUsedTotal(pausedDates: Date[]): number {
  return pausedDates.length
}

// Delivery dates are stored as UTC midnight — the cutoff is noon the day before, i.e. 12
// hours before that midnight instant.
export function canPauseDate(date: Date, now = new Date()): boolean {
  return now.getTime() < date.getTime() - 12 * 60 * 60 * 1000
}

export function buildDeliveryDates(startDate: Date, planDuration: number, pausedDates: Date[]): Date[] {
  const totalDays = planDuration + pausedDates.length
  return Array.from({ length: totalDays }, (_, i) => addDays(startDate, i))
}
