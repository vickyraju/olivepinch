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

// UTC offset (in minutes) Europe/London is running at a given instant — 0 (GMT) or 60 (BST).
// Diffing two locale-formatted strings of the same instant cancels out the host's own TZ, so
// this is accurate regardless of what timezone the server itself runs in.
function londonOffsetMinutes(instant: Date): number {
  const utc = new Date(instant.toLocaleString("en-US", { timeZone: "UTC" }))
  const london = new Date(instant.toLocaleString("en-US", { timeZone: "Europe/London" }))
  return (london.getTime() - utc.getTime()) / 60_000
}

// "Today" as the calendar day currently in effect in the UK, encoded as UTC midnight (this
// codebase's existing convention for calendar-day-only dates). Shifting `now` by the London
// offset and reading its UTC date fields gives the London wall-clock date without needing the
// server's own timezone to be London — used anywhere "today" means "today for our customers",
// not just a log timestamp.
export function londonToday(now = new Date()): Date {
  const local = new Date(now.getTime() + londonOffsetMinutes(now) * 60_000)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()))
}

// The UTC instant at which a given London wall-clock time falls on `day` (a UTC-midnight
// calendar date). Every customer-facing deadline goes through this so it means what a customer
// in Birmingham reads on their own clock, rather than drifting an hour across the BST/GMT
// changeover. The offset is sampled at the target time itself — DST transitions happen at ~1am
// UK, so only a deadline set inside that hour could sample the wrong side, and none of ours are.
export function londonInstant(day: Date, hours: number, minutes = 0): Date {
  const guess = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hours, minutes))
  return new Date(guess.getTime() - londonOffsetMinutes(guess) * 60_000)
}

// Delivery dates are stored as UTC midnight representing a calendar day. The pause cutoff is
// 12:30pm UK the day before that delivery.
export function canPauseDate(date: Date, now = new Date()): boolean {
  return now.getTime() < londonInstant(addDays(date, -1), 12, 30).getTime()
}

export function buildDeliveryDates(startDate: Date, planDuration: number, pausedDates: Date[]): Date[] {
  const totalDays = planDuration + pausedDates.length
  return Array.from({ length: totalDays }, (_, i) => addDays(startDate, i))
}
