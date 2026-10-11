import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FoodPhoto } from "@/components/ui/food-photo"
import { GOALS, GOAL_PHOTOS } from "@/data/menu"

const TEASER_META: Record<string, { kcal: string; protein: string }> = {
  "Weight Loss": { kcal: "450 kcal", protein: "35g P" },
  "Weight Gain": { kcal: "750 kcal", protein: "40g P" },
  "Weight Maintenance": { kcal: "600 kcal", protein: "38g P" },
  "Muscle Building": { kcal: "700 kcal", protein: "50g P" },
}

function DietPlansTeaser() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-14">
          <div className="max-w-xl">
            <p className="eyebrow mb-3">Pick your goal</p>
            <h2 className="text-3xl sm:text-4xl text-ink">One menu, four ways to eat</h2>
          </div>
          <Button asChild variant="outline" size="md" className="hidden sm:inline-flex">
            <Link to="/diet-plans">View all plans <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {GOALS.map((goal, i) => (
            <Link key={goal.id} to="/diet-plans" className="group block rounded-[20px] border border-border bg-surface overflow-hidden">
              <FoodPhoto seed={i} src={GOAL_PHOTOS[goal.id]} alt={goal.id} className="aspect-[4/3] rounded-none" />
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="eyebrow">Goal</span>
                  <span className="text-xs text-ink-muted">{TEASER_META[goal.id].kcal} · {TEASER_META[goal.id].protein}</span>
                </div>
                <h3 className="text-xl text-ink mb-1.5">{goal.id}</h3>
                <p className="text-sm text-ink-muted mb-3">{goal.description}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-olive-600">
                  See this plan <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Button asChild variant="outline" size="md">
            <Link to="/diet-plans">View all plans <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

export { DietPlansTeaser }
