import { useNavigate } from "react-router-dom"
import { Calendar } from "@/components/ui/calendar"
import { useSubscribe, type PlanDuration } from "@/lib/subscribe-context"
import { toDateKey, fromDateKey } from "@/lib/subscription"
import { StepNav } from "./step-nav"
import { cn } from "@/lib/utils"

const DURATIONS: { value: PlanDuration; label: string; hint: string }[] = [
  { value: 7, label: "7 days", hint: "Try it out" },
  { value: 14, label: "14 days", hint: "Most flexible" },
  { value: 28, label: "28 days", hint: "Best value" },
]

function minStartDate(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 2)
  return d
}

function Plan() {
  const { state, update } = useSubscribe()
  const navigate = useNavigate()
  const min = minStartDate()

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl text-ink mb-2">Choose your plan length</h1>
      <p className="text-ink-muted mb-8">You can renew, pause, or change your plan at any time from your dashboard.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
        {DURATIONS.map((d) => {
          const active = state.planDuration === d.value
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
        selected={state.startDate ? fromDateKey(state.startDate) : null}
        onSelect={(date) => {
          update({ startDate: toDateKey(date) })
          setTimeout(() => navigate("/subscribe/menu"), 200)
        }}
      />

      <StepNav backTo="/subscribe/meals" hideContinue />
    </div>
  )
}

export default Plan
