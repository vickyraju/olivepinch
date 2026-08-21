import { useNavigate } from "react-router-dom"
import { Sparkles, Star } from "lucide-react"
import { useSubscribe, type PlanTier } from "@/lib/subscribe-context"
import { cn } from "@/lib/utils"
import { StepNav } from "./step-nav"

const TIER_COPY: Record<PlanTier, { icon: typeof Sparkles; blurb: string }> = {
  Basic: { icon: Sparkles, blurb: "Our standard goal-matched menu rotation." },
  Advanced: { icon: Star, blurb: "Wider menu variety and premium recipes for the same goal." },
}

const OPTIONS: PlanTier[] = ["Basic", "Advanced"]

function Tier() {
  const { state, update } = useSubscribe()
  const navigate = useNavigate()

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl text-ink mb-2">Choose your tier</h1>
      <p className="text-ink-muted mb-8">One flat price for your whole plan — no per-meal charges.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {OPTIONS.map((tier) => {
          const { icon: Icon, blurb } = TIER_COPY[tier]
          const active = state.tier === tier
          return (
            <button
              key={tier}
              type="button"
              aria-pressed={active}
              onClick={() => {
                update({ tier })
                setTimeout(() => navigate("/subscribe/plan"), 200)
              }}
              className={cn(
                "text-left rounded-2xl border-2 p-6 transition-colors cursor-pointer",
                active ? "border-olive-600 bg-olive-50" : "border-border bg-surface hover:border-olive-300"
              )}
            >
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-full mb-4", active ? "bg-olive-600" : "bg-cream-100")}>
                <Icon className={cn("h-5 w-5", active ? "text-white" : "text-olive-600")} strokeWidth={1.75} />
              </div>
              <h3 className="text-xl font-semibold text-ink mb-1">{tier}</h3>
              <p className="text-base text-ink-muted">{blurb}</p>
            </button>
          )
        })}
      </div>

      <StepNav backTo="/subscribe/goal" hideContinue />
    </div>
  )
}

export default Tier
