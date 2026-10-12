import { computeEndDate } from "./subscription.js"

// Nothing stores "this subscription was a renewal" — a renewal is simply a later paid subscription
// for a customer who already had a paid one (POST /subscriptions/:id/renew creates a new row).
// So renewals are derived, which also covers every renewal made before this existed.

type Money = number | string | { toString(): string }

export interface RenewalSubscription {
  id: string
  createdAt: Date
  startDate: Date
  planDuration: number
  mealsPerDay: number
  tier: string
  pausedDates: Date[]
  discountAmount: Money
}

export interface RenewalPayment {
  subscriptionId: string | null
  status: string
  paidAt: Date | null
  amount: Money
}

interface PlanSummary {
  planDuration: number
  tier: string
  mealsPerDay: number
}

export interface Renewal {
  subscriptionId: string
  renewedAt: Date
  previous: PlanSummary
  current: PlanSummary
  amountPaid: number
  discountAmount: number
  // Whole days between the renewal and the previous plan's last delivery day:
  // positive = renewed that many days before it ended, 0 = on the last day, negative = after it lapsed.
  daysBeforePreviousEnd: number
}

const DAY_MS = 86_400_000
const utcDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
const plan = (s: RenewalSubscription): PlanSummary => ({ planDuration: s.planDuration, tier: s.tier, mealsPerDay: s.mealsPerDay })

// Newest first. A subscription only counts once a payment has succeeded, so abandoned renewal
// attempts (left PENDING_PAYMENT) never show up.
export function renewalsFor(subscriptions: RenewalSubscription[], payments: RenewalPayment[]): Renewal[] {
  const paidBySub = new Map<string, RenewalPayment[]>()
  for (const p of payments) {
    if (p.status !== "succeeded" || !p.subscriptionId) continue
    paidBySub.set(p.subscriptionId, [...(paidBySub.get(p.subscriptionId) ?? []), p])
  }

  const paid = subscriptions
    .filter((s) => paidBySub.has(s.id))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  const renewals: Renewal[] = []
  for (let i = 1; i < paid.length; i++) {
    const current = paid[i]!
    const previous = paid[i - 1]!
    const subPayments = paidBySub.get(current.id)!
    const paidTimes = subPayments.map((p) => p.paidAt?.getTime()).filter((t): t is number => t !== undefined)
    const renewedAt = paidTimes.length ? new Date(Math.min(...paidTimes)) : current.createdAt
    const previousEnd = computeEndDate(previous.startDate, previous.planDuration, previous.pausedDates)
    renewals.push({
      subscriptionId: current.id,
      renewedAt,
      previous: plan(previous),
      current: plan(current),
      amountPaid: subPayments.reduce((sum, p) => sum + Number(p.amount.toString()), 0),
      discountAmount: Number(current.discountAmount.toString()),
      daysBeforePreviousEnd: Math.round((utcDay(previousEnd) - utcDay(renewedAt)) / DAY_MS),
    })
  }
  return renewals.reverse()
}

export function lastRenewedAt(renewals: Renewal[]): Date | null {
  return renewals[0]?.renewedAt ?? null
}
