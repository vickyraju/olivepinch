import { Link } from "react-router-dom"
import { ChefHat, Leaf, PauseCircle, ShieldCheck } from "lucide-react"
import { FoodPhoto } from "@/components/ui/food-photo"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const STATS = [
  { value: "1", label: "Local kitchen, prepping fresh every morning" },
  { value: "4x", label: "Pauses allowed per month, no meals lost" },
  { value: "7–28", label: "Day plans, your choice of length" },
]

const VALUES = [
  { icon: ChefHat, title: "Cooked fresh, not batch-frozen", desc: "Every meal is prepared the morning it's delivered — nothing sits in a freezer waiting for an order." },
  { icon: Leaf, title: "Matched to your goal", desc: "Weight loss, weight gain, maintenance, or muscle building — your default menu is filtered to fit, every day." },
  { icon: PauseCircle, title: "Flexible by design", desc: "Pause up to four times a month and your plan's end date simply moves — you never lose a meal you've paid for." },
  { icon: ShieldCheck, title: "Your data, your control", desc: "Health data is only ever used for BMI and meal recommendations. Export or delete it any time from your dashboard." },
]

function About() {
  return (
    <div>
      <section className="pt-14 pb-16 sm:pt-20 sm:pb-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="grid grid-cols-2 gap-4 order-2 lg:order-1">
            <FoodPhoto seed={1} src="/images/about-1.jpg" alt="Kitchen prep early in the morning" className="aspect-square" />
            <FoodPhoto seed={2} src="/images/about-2.jpg" alt="Red lentil dahl over brown rice" className="aspect-square mt-8" />
          </div>

          <div className="order-1 lg:order-2">
            <h1 className="text-4xl sm:text-5xl text-ink mb-5">
              Built for one city, one fresh delivery at a time
            </h1>
            <p className="text-ink-muted leading-relaxed mb-4">
              OlivePinch started with a simple idea: healthy, structured eating shouldn't
              mean choosing between cooking every meal yourself or settling for generic
              takeaway. We prepare every meal fresh, match it to your goal and diet, and
              deliver it to your door each morning.
            </p>
            <p className="text-ink-muted leading-relaxed mb-8">
              We're currently piloting exclusively in Birmingham, with one kitchen serving
              the whole zone — so every meal is made close to where it's delivered.
            </p>

            <div className="grid grid-cols-3 gap-6">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <div className="font-display text-3xl font-bold text-olive-600">{stat.value}</div>
                  <div className="mt-1 text-sm text-ink-muted leading-snug">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-cream-100">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-xl mx-auto text-center mb-14">
            <h2 className="text-3xl sm:text-4xl text-ink">What makes it work</h2>
            <p className="mt-3 text-ink-muted">The parts of the service we designed around, not bolted onto.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {VALUES.map((v) => (
              <Card key={v.title} className="p-6 flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-olive-50">
                  <v.icon className="h-5 w-5 text-olive-600" strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-ink mb-1">{v.title}</h3>
                  <p className="text-sm text-ink-muted leading-relaxed">{v.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="rounded-2xl bg-olive-600 px-8 py-14 sm:px-16 sm:py-16 text-center">
            <h2 className="text-3xl sm:text-4xl text-white">See if we deliver to you</h2>
            <p className="mt-3 text-olive-100 max-w-md mx-auto">
              Enter your postcode to check coverage and start building your plan.
            </p>
            <Button asChild variant="surface" size="lg" className="mt-8">
              <Link to="/subscribe">Check your postcode</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default About
