import { Link } from "react-router-dom"
import { MapPin, Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FoodPhoto } from "@/components/ui/food-photo"

function Hero() {
  return (
    <section className="pt-14 pb-20 sm:pt-20 sm:pb-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <Badge variant="olive" className="mb-5">
            <MapPin className="h-3.5 w-3.5" /> Now piloting in Birmingham, UK
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl text-ink">
            Fresh meals, built around <span className="text-olive-600">your</span> goal.
          </h1>
          <p className="mt-5 text-lg text-ink-muted max-w-lg">
            Tell us your goal and diet preferences, we handle the rest. Freshly prepared
            meals delivered to your door every morning — no cooking, no compromise.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button asChild variant="accent" size="lg">
              <Link to="/subscribe">Check your postcode</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
          <div className="mt-8 flex items-center gap-2 text-sm text-ink-muted">
            <Leaf className="h-4 w-4 text-olive-600" />
            Pause up to 4x a month · Cancel anytime
          </div>
        </div>

        <div className="relative">
          <div className="grid grid-cols-2 gap-4">
            <FoodPhoto seed={0} className="aspect-[4/5]" />
            <FoodPhoto seed={1} className="aspect-[4/5] mt-8" />
          </div>
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[85%] rounded-2xl bg-surface border border-border shadow-lifted px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-ink">Today's plan</span>
              <Badge variant="coral">Muscle Building</Badge>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="neutral">620 kcal</Badge>
              <Badge variant="neutral">48g protein</Badge>
              <Badge variant="neutral">3 meals/day</Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export { Hero }
