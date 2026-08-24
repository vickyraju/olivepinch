import { Star } from "lucide-react"
import { AvatarPlaceholder } from "@/components/ui/avatar-placeholder"

const TESTIMONIALS = [
  {
    name: "Priya Shah",
    role: "Muscle Building plan",
    quote: "Swapping meals to fit my macros took two minutes, and the pause feature saved me during a work trip without losing a single paid meal.",
  },
  {
    name: "Daniel Osei",
    role: "Weight Loss plan",
    quote: "Portion sizes and calories are consistent every day, which is exactly what I needed to actually stick with a plan for once.",
  },
  {
    name: "Freya Whitlock",
    role: "Vegetarian, Weight Maintenance",
    quote: "I set my allergies once at signup and every default menu since has respected them without me having to double-check.",
  },
  {
    name: "Marcus Ilie",
    role: "Weight Gain plan",
    quote: "Deliveries have shown up in my morning window every day since I started. Renewing took under a minute and I stayed logged in.",
  },
]

function Testimonials() {
  return (
    <section className="py-20 sm:py-28 bg-cream-100 border-y border-border">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-xl mx-auto text-center mb-14">
          <p className="eyebrow mb-3">From our customers</p>
          <h2 className="text-3xl sm:text-4xl text-ink">What people are saying</h2>
        </div>

        <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory -mx-5 px-5 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              className="min-w-[280px] sm:min-w-0 snap-start rounded-[20px] bg-surface border border-border p-6 flex flex-col"
            >
              <div className="flex gap-0.5 mb-4" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, star) => (
                  <Star key={star} className="h-4 w-4 fill-olive-600 text-olive-600" />
                ))}
              </div>
              <p className="text-sm text-ink-muted leading-relaxed flex-1 mb-5">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <AvatarPlaceholder name={t.name} seed={i} />
                <div>
                  <div className="text-sm font-semibold text-ink">{t.name}</div>
                  <div className="text-xs text-ink-muted">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export { Testimonials }
