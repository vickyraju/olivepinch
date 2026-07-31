import { useNavigate } from "react-router-dom"
import { Flame, TrendingDown, TrendingUp, Dumbbell } from "lucide-react"
import { GOALS, type Goal as GoalId } from "@/data/menu"
import { useSubscribe } from "@/lib/subscribe-context"
import { StepNav } from "./step-nav"
import { cn } from "@/lib/utils"

const ICONS: Record<GoalId, typeof Flame> = {
  "Weight Loss": TrendingDown,
  "Weight Gain": TrendingUp,
  "Weight Maintenance": Flame,
  "Muscle Building": Dumbbell,
}

function Goal() {
  const { state, update } = useSubscribe()
  const navigate = useNavigate()

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl text-ink mb-2">What's your goal?</h1>
      <p className="text-ink-muted mb-8">This drives your default meal recommendations — you can fine-tune the menu later.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GOALS.map((goal) => {
          const Icon = ICONS[goal.id]
          const active = state.goal === goal.id
          return (
            <button
              key={goal.id}
              type="button"
              aria-pressed={active}
              onClick={() => update({ goal: goal.id })}
              className={cn(
                "text-left rounded-2xl border-2 p-6 transition-colors cursor-pointer",
                active ? "border-olive-600 bg-olive-50" : "border-border bg-surface hover:border-olive-300"
              )}
            >
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-full mb-4", active ? "bg-olive-600" : "bg-cream-100")}>
                <Icon className={cn("h-5 w-5", active ? "text-white" : "text-olive-600")} strokeWidth={1.75} />
              </div>
              <h3 className="text-xl font-semibold text-ink mb-1">{goal.id}</h3>
              <p className="text-base text-ink-muted">{goal.description}</p>
            </button>
          )
        })}
      </div>

      <StepNav
        backTo="/subscribe/account-setup"
        continueDisabled={!state.goal}
        onContinue={() => navigate("/subscribe/preferences")}
      />
    </div>
  )
}

export default Goal
