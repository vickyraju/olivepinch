import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { FoodPhoto } from "@/components/ui/food-photo"

function Hero() {
  return (
    <section className="pt-14 pb-20 sm:pt-20 sm:pb-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow mb-4">Fresh · never frozen · Birmingham made</p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl text-ink">
            Fresh meals, built around <em>your</em> goal.
          </h1>
          <p className="mt-5 text-lg text-ink-muted max-w-lg">
            Tell us your goal and diet preferences, we handle the rest. Freshly prepared
            meals delivered to your door every morning — no cooking, no compromise.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button asChild variant="primary" size="lg">
              <Link to="/subscribe">Check your postcode</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="grid grid-cols-2 gap-4">
            <FoodPhoto seed={0} src="/images/hero-1.jpg" alt="Grilled chicken breast over jasmine rice with broccoli" className="aspect-[4/5]" />
            <FoodPhoto seed={1} src="/images/hero-2.jpg" alt="Pan-seared salmon over quinoa with roasted vegetables" className="aspect-[4/5] mt-8" />
          </div>
        </div>
      </div>
    </section>
  )
}

export { Hero }
