import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FoodPhoto } from "@/components/ui/food-photo"
import { GOALS } from "@/data/menu"
import { cn } from "@/lib/utils"

const TEASER_META: Record<string, { kcal: string; protein: string }> = {
  "Weight Loss": { kcal: "~450 kcal", protein: "35g protein" },
  "Weight Gain": { kcal: "~750 kcal", protein: "40g protein" },
  "Weight Maintenance": { kcal: "~600 kcal", protein: "38g protein" },
  "Muscle Building": { kcal: "~700 kcal", protein: "50g protein" },
}

function DietPlansTeaser() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-14">
          <div className="max-w-xl">
            <h2 className="text-3xl sm:text-4xl text-ink">Plans built around your goal</h2>
            <p className="mt-3 text-ink-muted">
              Pick a goal to start — you'll fine-tune diet type, allergies, and your exact menu in the next steps.
            </p>
          </div>
          <Button asChild variant="outline" size="md" className="hidden sm:inline-flex">
            <Link to="/diet-plans">View all plans <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {GOALS.map((goal, i) => (
            <Link key={goal.id} to="/diet-plans" className={cn("group", i % 2 === 1 && "lg:mt-8")}>
              <Card className="overflow-hidden flex flex-col h-full hover:shadow-lifted hover:-translate-y-1 transition-[box-shadow,transform] duration-200">
                <FoodPhoto seed={i} className="aspect-[4/3] rounded-none" />
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-lg text-ink mb-1.5">{goal.id}</h3>
                  <p className="text-sm text-ink-muted mb-4 flex-1">{goal.description}</p>
                  <div className="flex gap-1.5 flex-wrap mb-4">
                    <Badge variant="olive">{TEASER_META[goal.id].kcal}</Badge>
                    <Badge variant="coral">{TEASER_META[goal.id].protein}</Badge>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-olive-600 group-hover:text-olive-700">
                    See this plan <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Card>
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
