import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, ChevronDown } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FoodPhoto } from "@/components/ui/food-photo"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { GOALS, GOAL_PHOTOS, SLOTS_BY_MEALS_PER_DAY, defaultMenuFor, type Goal } from "@/data/menu"
import type { PlanTier } from "@/lib/subscribe-context"
import { usePlans, priceFor, formatGBP } from "@/lib/pricing"
import { cn } from "@/lib/utils"

const TEASER_META: Record<Goal, { kcal: string; protein: string; from: string }> = {
  "Weight Loss": { kcal: "~450 kcal", protein: "35g protein", from: "5.20" },
  "Weight Gain": { kcal: "~750 kcal", protein: "40g protein", from: "5.80" },
  "Weight Maintenance": { kcal: "~600 kcal", protein: "38g protein", from: "5.20" },
  "Muscle Building": { kcal: "~700 kcal", protein: "50g protein", from: "5.95" },
}

const DURATIONS: (7 | 14 | 28)[] = [7, 14, 28]
const TIERS: PlanTier[] = ["Basic", "Advanced"]
const MEALS_OPTIONS: (1 | 2 | 3)[] = [1, 2, 3]

function GoalCard({ goal, seed }: { goal: (typeof GOALS)[number]; seed: number }) {
  const [expanded, setExpanded] = useState(false)
  const sample = SLOTS_BY_MEALS_PER_DAY[3].map((slot) => defaultMenuFor(goal.id, ["Meat"], [], slot))

  return (
    <Card className="overflow-hidden flex flex-col">
      <FoodPhoto seed={seed} src={GOAL_PHOTOS[goal.id]} alt={goal.id} className="aspect-[16/9] rounded-none" />
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-xl text-ink mb-1.5">{goal.id}</h3>
        <p className="text-sm text-ink-muted mb-4">{goal.description}</p>
        <div className="flex gap-1.5 flex-wrap mb-4">
          <Badge variant="olive">{TEASER_META[goal.id].kcal}</Badge>
          <Badge variant="coral">{TEASER_META[goal.id].protein}</Badge>
        </div>
        <p className="text-sm text-ink-muted mb-5">
          from <strong className="text-ink">£{TEASER_META[goal.id].from}</strong>/meal
        </p>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center justify-between text-sm font-semibold text-ink py-3 border-t border-border cursor-pointer"
          aria-expanded={expanded}
        >
          View sample menu
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </button>
        {expanded && (
          <ul className="text-sm text-ink-muted space-y-2 pb-4">
            {sample.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>{item.slot}</span>
                <span className="text-ink text-right">{item.name}</span>
              </li>
            ))}
          </ul>
        )}

        <Button asChild variant="primary" size="md" className="mt-auto">
          <Link to="/subscribe">Choose this goal</Link>
        </Button>
      </div>
    </Card>
  )
}

function PriceEstimator() {
  const [goal, setGoal] = useState<Goal>("Muscle Building")
  const [tier, setTier] = useState<PlanTier>("Basic")
  const [planDuration, setPlanDuration] = useState<7 | 14 | 28>(14)
  const [mealsPerDay, setMealsPerDay] = useState<1 | 2 | 3>(2)
  const plans = usePlans()
  const total = priceFor(plans, goal, planDuration, tier, mealsPerDay)

  return (
    <Card className="p-6 sm:p-8">
      <h2 className="text-xl text-ink mb-1">See your price</h2>
      <p className="text-sm text-ink-muted mb-6">Pricing is set by your goal and plan length — pick both to see the exact total.</p>

      <div>
        <label className="text-sm font-medium text-ink block mb-1.5">Goal</label>
        <Select value={goal} onValueChange={(v) => setGoal(v as Goal)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {GOALS.map((g) => <SelectItem key={g.id} value={g.id}>{g.id}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-5">
        <label className="text-sm font-medium text-ink block mb-1.5">Plan length</label>
        <div className="grid grid-cols-3 gap-2.5">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={planDuration === d}
              onClick={() => setPlanDuration(d)}
              className={cn(
                "rounded-lg border-2 py-2.5 text-sm font-semibold transition-colors cursor-pointer",
                planDuration === d ? "border-olive-600 bg-olive-50 text-olive-700" : "border-border text-ink hover:border-olive-300"
              )}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <label className="text-sm font-medium text-ink block mb-1.5">Meals per day</label>
        <div className="grid grid-cols-3 gap-2.5">
          {MEALS_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mealsPerDay === m}
              onClick={() => setMealsPerDay(m)}
              className={cn(
                "rounded-lg border-2 py-2.5 text-sm font-semibold transition-colors cursor-pointer",
                mealsPerDay === m ? "border-olive-600 bg-olive-50 text-olive-700" : "border-border text-ink hover:border-olive-300"
              )}
            >
              {m} meal{m > 1 ? "s" : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <label className="text-sm font-medium text-ink block mb-1.5">Tier</label>
        <div className="grid grid-cols-2 gap-2.5">
          {TIERS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tier === t}
              onClick={() => setTier(t)}
              className={cn(
                "rounded-lg border-2 py-2.5 text-sm font-semibold transition-colors cursor-pointer",
                tier === t ? "border-olive-600 bg-olive-50 text-olive-700" : "border-border text-ink hover:border-olive-300"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-lg bg-olive-50 px-5 py-4">
        <span className="text-sm text-ink-muted">Total</span>
        <span className="font-display text-2xl font-bold text-ink">{total !== null ? formatGBP(total) : "—"}</span>
      </div>

      <Button asChild variant="primary" size="lg" className="w-full mt-5">
        <Link to="/subscribe">Get started <ArrowRight className="h-4 w-4" /></Link>
      </Button>
    </Card>
  )
}

function DietPlans() {
  return (
    <div>
      <section className="pt-14 pb-16 sm:pt-20 sm:pb-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl text-ink">A plan for whatever your goal is</h1>
          <p className="mt-4 text-lg text-ink-muted">
            Every plan starts from a menu matched to your goal, filtered to your diet type
            and allergies — and you can still swap any meal you want.
          </p>
        </div>
      </section>

      <section className="pb-16 sm:pb-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-6 sm:grid-cols-2">
            {GOALS.map((goal, i) => (
              <GoalCard key={goal.id} goal={goal} seed={i} />
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-28 bg-cream-100 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl px-5 sm:px-8">
          <PriceEstimator />
        </div>
      </section>
    </div>
  )
}

export default DietPlans
