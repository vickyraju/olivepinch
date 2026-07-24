import { MapPinCheck, SlidersHorizontal, Truck } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = [
  {
    icon: MapPinCheck,
    title: "Check your postcode",
    description: "We're piloting in one UK city right now. Enter your postcode to confirm we deliver to you.",
  },
  {
    icon: SlidersHorizontal,
    title: "Set your goal & menu",
    description: "Share your goal, diet type, and allergies. We build your daily menu — or you customize every meal.",
  },
  {
    icon: Truck,
    title: "Fresh, delivered daily",
    description: "Your meals are prepared fresh each morning and delivered within your chosen window.",
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-cream-100">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-xl mx-auto text-center mb-14">
          <h2 className="text-3xl sm:text-4xl text-ink">How OlivePinch works</h2>
          <p className="mt-3 text-ink-muted">Three steps between you and your first delivery.</p>
        </div>

        <div className="relative grid gap-8 md:grid-cols-3">
          <div className="hidden md:block absolute top-11 left-[16.5%] right-[16.5%] border-t-2 border-dashed border-olive-200" aria-hidden />
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className={cn(
                "relative rounded-2xl bg-surface border border-border p-8 shadow-soft",
                i === 1 && "md:-translate-y-4",
                i === 2 && "md:translate-y-3"
              )}
            >
              <span className="absolute -top-4 -left-2 font-display text-6xl font-extrabold text-olive-100 select-none" aria-hidden>
                {i + 1}
              </span>
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-olive-50 mb-5">
                <step.icon className="h-6 w-6 text-olive-600" strokeWidth={1.75} />
              </div>
              <h3 className="text-xl text-ink mb-2">{step.title}</h3>
              <p className="text-ink-muted leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { HowItWorks }
