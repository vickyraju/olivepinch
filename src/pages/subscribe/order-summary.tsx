import { useState } from "react"
import { formatPhoneNumberIntl } from "react-phone-number-input"
import { Lock, ShieldCheck } from "lucide-react"
import { useSubscribe } from "@/lib/subscribe-context"
import { usePlans, priceFor, formatGBP } from "@/lib/pricing"
import { computeEndDate, calculateAge } from "@/lib/subscription"
import { GOAL_TO_ENUM, TIER_TO_ENUM } from "@/lib/enum-map"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink font-medium text-right">{value}</dd>
    </div>
  )
}

function OrderSummary({
  onPay,
  payLabel = "Continue to Payment",
  payDisabled = false,
}: {
  onPay?: () => void
  payLabel?: string
  payDisabled?: boolean
} = {}) {
  const { state, update } = useSubscribe()
  const plans = usePlans()
  const rawTotal = state.planDuration ? priceFor(plans, state.goal, state.planDuration, state.tier, state.mealsPerDay) : null
  const total = rawTotal !== null && state.promoDiscount ? Math.max(0, rawTotal - state.promoDiscount) : rawTotal
  const endDate = state.startDate && state.planDuration ? computeEndDate(state.startDate, state.planDuration, []) : null
  const age = state.profile.dateOfBirth ? calculateAge(state.profile.dateOfBirth) : null
  const totalMeals = (state.planDuration ?? 0) * (state.mealsPerDay ?? 0)
  const perMeal = total !== null && totalMeals > 0 ? total / totalMeals : null

  const [promoInput, setPromoInput] = useState(state.promoCode ?? "")
  const [promoError, setPromoError] = useState("")
  const [applyingPromo, setApplyingPromo] = useState(false)

  async function applyPromo() {
    if (!promoInput.trim() || !state.goal || !state.planDuration) return
    setApplyingPromo(true)
    setPromoError("")
    try {
      const result = await api.post<{ valid: boolean; discountAmount: number }>("/promo-codes/validate", {
        code: promoInput.trim(),
        goal: GOAL_TO_ENUM[state.goal],
        tier: TIER_TO_ENUM[state.tier ?? "Basic"],
        planDuration: state.planDuration,
        mealsPerDay: state.mealsPerDay ?? 2,
      })
      update({ promoCode: promoInput.trim(), promoDiscount: result.discountAmount })
    } catch (err) {
      update({ promoCode: null, promoDiscount: null })
      setPromoError(err instanceof ApiError ? err.message : "Couldn't apply that code — try again.")
    } finally {
      setApplyingPromo(false)
    }
  }

  return (
    <div className="rounded-2xl bg-surface border border-border p-6 shadow-soft lg:sticky lg:top-24 space-y-5 text-sm">
      <h2 className="text-lg text-ink">Order summary</h2>

      <dl className="space-y-2.5">
        <Row label="Name" value={state.profile.fullName || "—"} />
        <Row label="Email" value={state.profile.email || "—"} />
        <Row label="Phone" value={state.profile.phone ? formatPhoneNumberIntl(state.profile.phone) : "—"} />
        <Row label="Age" value={age ? String(age) : "—"} />
      </dl>

      <dl className="space-y-2.5 border-t border-border pt-4">
        <Row label="Plan length" value={state.planDuration ? `${state.planDuration} days` : "—"} />
        <Row label="Meals/day" value={state.mealsPerDay ? String(state.mealsPerDay) : "—"} />
        <Row label="Goal" value={state.goal ?? "—"} />
        <Row label="Tier" value={state.tier ?? "—"} />
        <Row label="Preferred food" value={state.dietTypes.join(", ") || "—"} />
        <Row label="Allergens" value={state.allergens.length ? state.allergens.join(", ") : "None"} />
      </dl>

      <dl className="space-y-2.5 border-t border-border pt-4">
        <Row label="Start date" value={state.startDate ? new Date(state.startDate).toLocaleDateString("en-GB") : "—"} />
        <Row label="End date" value={endDate ? new Date(endDate).toLocaleDateString("en-GB") : "—"} />
      </dl>

      <div className="border-t border-border pt-4 space-y-2">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Promo code"
            value={promoInput}
            onChange={(e) => {
              setPromoInput(e.target.value)
              setPromoError("")
            }}
            className="flex-1"
          />
          <Button type="button" variant="outline" size="sm" disabled={!promoInput.trim() || applyingPromo} onClick={applyPromo}>
            {applyingPromo ? "Applying…" : "Apply"}
          </Button>
        </div>
        {promoError && <p className="text-xs text-coral-600">{promoError}</p>}
        {state.promoDiscount ? <p className="text-xs text-olive-600">Promo code applied — {formatGBP(state.promoDiscount)} off</p> : null}
      </div>

      <div className="border-t border-border pt-4">
        {total !== null ? (
          <div className="flex justify-between items-baseline">
            <span className="text-ink font-semibold">Total</span>
            <div className="text-right">
              {state.promoDiscount ? (
                <span className="block text-sm text-ink-muted line-through">{formatGBP(rawTotal!)}</span>
              ) : null}
              <span className="font-display text-2xl font-bold text-ink">{formatGBP(total)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Your exact price will be confirmed at checkout.</p>
        )}
        {perMeal !== null && <p className="text-xs text-ink-muted mt-1 text-right">{formatGBP(perMeal)} per meal</p>}
      </div>

      {onPay && (
        <div className="border-t border-border pt-4 space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-olive-50 p-4">
            <ShieldCheck className="h-5 w-5 text-olive-600 shrink-0 mt-0.5" />
            <p className="text-sm text-ink-muted">
              You'll be redirected to Worldpay's secure payment page to enter your card details — we never see or store your card number.
            </p>
          </div>
          <Button type="button" variant="accent" size="lg" className="w-full" disabled={payDisabled} onClick={onPay}>
            <Lock className="h-4 w-4" />
            {payLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

export { OrderSummary }
