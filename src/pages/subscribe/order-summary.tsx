import { useSubscribe } from "@/lib/subscribe-context"
import { priceForDayMenus, formatGBP } from "@/lib/pricing"
import { computeEndDate } from "@/lib/subscription"

function OrderSummary() {
  const { state } = useSubscribe()
  const total = priceForDayMenus(state.dayMenus)
  const endDate = state.startDate ? computeEndDate(state.startDate, state.planDuration, []) : null

  return (
    <div className="rounded-2xl bg-surface border border-border p-6 shadow-soft sticky top-24">
      <h2 className="text-lg text-ink mb-4">Order summary</h2>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-ink-muted">Name</dt><dd className="text-ink font-medium">{state.profile.fullName || "—"}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-muted">Age</dt><dd className="text-ink font-medium">{state.profile.age || "—"}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-muted">Email</dt><dd className="text-ink font-medium">{state.profile.email || "—"}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-muted">Plan length</dt><dd className="text-ink font-medium">{state.planDuration} days</dd></div>
        <div className="flex justify-between"><dt className="text-ink-muted">Meals/day</dt><dd className="text-ink font-medium">{state.mealsPerDay}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-muted">Goal</dt><dd className="text-ink font-medium">{state.goal}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-muted">Preferred food</dt><dd className="text-ink font-medium">{state.dietTypes.join(", ") || "—"}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-muted">Allergens</dt><dd className="text-ink font-medium">{state.allergens.length ? state.allergens.join(", ") : "None"}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-muted">Start date</dt><dd className="text-ink font-medium">{state.startDate ? new Date(state.startDate).toLocaleDateString("en-GB") : "—"}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-muted">End date</dt><dd className="text-ink font-medium">{endDate ? new Date(endDate).toLocaleDateString("en-GB") : "—"}</dd></div>
      </dl>
      <div className="border-t border-border mt-4 pt-4 flex justify-between items-baseline">
        <span className="text-ink font-semibold">Total</span>
        <span className="font-display text-2xl font-bold text-ink">{formatGBP(total)}</span>
      </div>
    </div>
  )
}

export { OrderSummary }
