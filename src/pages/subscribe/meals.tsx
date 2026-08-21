import { useNavigate } from "react-router-dom"
import { useSubscribe, type MealsPerDay } from "@/lib/subscribe-context"
import { StepNav } from "./step-nav"
import { cn } from "@/lib/utils"

const OPTIONS: { value: MealsPerDay; label: string; slots: string }[] = [
  { value: 1, label: "1 meal", slots: "Lunch" },
  { value: 2, label: "2 meals", slots: "Breakfast + Dinner" },
  { value: 3, label: "3 meals", slots: "Breakfast + Lunch + Dinner" },
]

function Meals() {
  const { state, update } = useSubscribe()
  const navigate = useNavigate()

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl text-ink mb-2">How many meals a day?</h1>
      <p className="text-ink-muted mb-8">This sets how many meal slots we fill for every day of your plan.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {OPTIONS.map((opt) => {
          const active = state.mealsPerDay === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => {
                update({ mealsPerDay: opt.value })
                setTimeout(() => navigate("/subscribe/menu"), 200)
              }}
              className={cn(
                "rounded-2xl border-2 p-6 text-left transition-colors cursor-pointer",
                active ? "border-olive-600 bg-olive-50" : "border-border bg-surface hover:border-olive-300"
              )}
            >
              <div className="font-display text-3xl font-bold text-ink mb-1">{opt.value}</div>
              <div className="text-sm font-medium text-ink">{opt.label}/day</div>
              <div className="text-xs text-ink-muted mt-2">{opt.slots}</div>
            </button>
          )
        })}
      </div>

      <StepNav backTo="/subscribe/preferences" hideContinue />
    </div>
  )
}

export default Meals
