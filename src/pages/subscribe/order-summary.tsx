import { useSubscribe } from "@/lib/subscribe-context"
import { estimateTotal, formatGBP } from "@/lib/pricing"
import { computeEndDate, calculateAge } from "@/lib/subscription"

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink font-medium text-right">{value}</dd>
    </div>
  )
}

function OrderSummary() {
  const { state } = useSubscribe()
  const estimate = estimateTotal(state.dayMenus, state.menuItemPrices, state.planDuration, state.mealsPerDay)
  const endDate = state.startDate ? computeEndDate(state.startDate, state.planDuration, []) : null
  const age = state.profile.dateOfBirth ? calculateAge(state.profile.dateOfBirth) : null

  return (
    <div className="rounded-2xl bg-surface border border-border p-6 shadow-soft lg:sticky lg:top-24 space-y-5 text-sm">
      <h2 className="text-lg text-ink">Order summary</h2>

      <dl className="space-y-2.5">
        <Row label="Name" value={state.profile.fullName || "—"} />
        <Row label="Email" value={state.profile.email || "—"} />
        <Row label="Phone" value={state.profile.phone || "—"} />
        <Row label="Age" value={age ? String(age) : "—"} />
      </dl>

      <dl className="space-y-2.5 border-t border-border pt-4">
        <Row label="Plan length" value={`${state.planDuration} days`} />
        <Row label="Meals/day" value={String(state.mealsPerDay)} />
        <Row label="Goal" value={state.goal ?? "—"} />
        <Row label="Preferred food" value={state.dietTypes.join(", ") || "—"} />
        <Row label="Allergens" value={state.allergens.length ? state.allergens.join(", ") : "None"} />
      </dl>

      <dl className="space-y-2.5 border-t border-border pt-4">
        <Row label="Delivery" value={state.deliverySlot} />
        <Row label="Start date" value={state.startDate ? new Date(state.startDate).toLocaleDateString("en-GB") : "—"} />
        <Row label="End date" value={endDate ? new Date(endDate).toLocaleDateString("en-GB") : "—"} />
      </dl>

      <div className="border-t border-border pt-4">
        {estimate ? (
          <div className="flex justify-between items-baseline">
            <span className="text-ink font-semibold">{estimate.isEstimate ? "Estimated total" : "Total"}</span>
            <span className="font-display text-2xl font-bold text-ink">{formatGBP(estimate.total)}</span>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Your exact price will be confirmed at checkout.</p>
        )}
        {estimate?.isEstimate && <p className="text-xs text-ink-muted mt-1">Confirmed at checkout, once every day's meals are set.</p>}
      </div>
    </div>
  )
}

export { OrderSummary }
