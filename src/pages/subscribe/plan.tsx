import { useNavigate } from "react-router-dom"
import { Calendar } from "@/components/ui/calendar"
import { useSubscribe, type PlanDuration, type MealsPerDay } from "@/lib/subscribe-context"
import { toDateKey, fromDateKey } from "@/lib/subscription"
import { usePlans, priceFor, formatGBP } from "@/lib/pricing"
import { StepNav } from "./step-nav"
import { cn } from "@/lib/utils"

const DURATIONS: { value: PlanDuration; label: string; hint: string }[] = [
  { value: 7, label: "7 days", hint: "Try it out" },
  { value: 14, label: "14 days", hint: "Most flexible" },
  { value: 28, label: "28 days", hint: "Best value" },
]

const MEALS_OPTIONS: { value: MealsPerDay; label: string }[] = [
  { value: 1, label: "1 meal" },
  { value: 2, label: "2 meals" },
  { value: 3, label: "3 meals" },
]

function minStartDate(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 2)
  return d
}

function maxStartDate(): Date {
  const d = minStartDate()
  d.setDate(d.getDate() + 30)
  return d
}

function Plan() {
  const { state, update } = useSubscribe()
  const navigate = useNavigate()
  const min = minStartDate()
  const max = maxStartDate()
  const plans = usePlans()

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl text-ink mb-2">Choose your plan</h1>
      <p className="text-ink-muted mb-8">You can renew, pause, or change your plan at any time from your dashboard.</p>

      <h2 className="text-xl text-ink mb-1">How many meals a day?</h2>
      <p className="text-sm text-ink-muted mb-4">This sets how many meal slots we fill for every day of your plan.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
        {MEALS_OPTIONS.map((opt) => {
          const active = state.mealsPerDay === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => update({ mealsPerDay: opt.value })}
              className={cn(
                "rounded-xl border-2 p-5 text-left transition-colors cursor-pointer",
                active ? "border-olive-600 bg-olive-50" : "border-border bg-surface hover:border-olive-300"
              )}
            >
              <div className="font-display text-2xl font-bold text-ink">{opt.label}/day</div>
            </button>
          )
        })}
      </div>

      <h2 className="text-xl text-ink mb-1">Choose your plan length</h2>
      <p className="text-sm text-ink-muted mb-4">Prices reflect the meal count you picked above.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
        {DURATIONS.map((d) => {
          const active = state.planDuration === d.value
          const total = priceFor(plans, state.goal, d.value, state.tier, state.mealsPerDay)
          return (
            <button
              key={d.value}
              type="button"
              onClick={() => update({ planDuration: d.value })}
              aria-pressed={active}
              className={cn(
                "rounded-xl border-2 p-5 text-left transition-colors cursor-pointer",
                active ? "border-olive-600 bg-olive-50" : "border-border bg-surface hover:border-olive-300"
              )}
            >
              <div className="font-display text-2xl font-bold text-ink">{d.label}</div>
              <div className="text-sm text-ink-muted mt-1">{d.hint}</div>
              {total !== null ? (
                <div className="mt-3 pt-3 border-t border-border/60 flex items-baseline justify-between">
                  <span className="text-lg font-semibold text-ink">{formatGBP(total)}</span>
                  <span className="text-xs text-ink-muted">{formatGBP(total / d.value)}/day</span>
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-border/60 text-xs text-ink-muted">Pick meals per day above to see price</div>
              )}
            </button>
          )
        })}
      </div>

      <h2 className="text-xl text-ink mb-1">Pick your start date</h2>
      <p className="text-sm text-ink-muted mb-4">
        Earliest available start is {min.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} — we need 2 days to prepare your first delivery.
      </p>
      <Calendar
        minDate={min}
        maxDate={max}
        selected={state.startDate ? fromDateKey(state.startDate) : null}
        onSelect={(date) => update({ startDate: toDateKey(date) })}
      />

      <StepNav
        backTo="/subscribe/tier"
        continueDisabled={!state.planDuration || !state.startDate || !state.mealsPerDay}
        onContinue={() => navigate("/subscribe/preferences")}
      />
    </div>
  )
}

export default Plan
