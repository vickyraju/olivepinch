import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SAMPLE_MENU } from "@/data/sample-menu"
import { cn } from "@/lib/utils"

function SampleMenu() {
  const [active, setActive] = useState(SAMPLE_MENU[0]!.box)
  const group = SAMPLE_MENU.find((g) => g.box === active) ?? SAMPLE_MENU[0]!

  return (
    <section className="pb-16 sm:pb-20" aria-labelledby="sample-menu-heading">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl mb-8">
          <h2 id="sample-menu-heading" className="text-3xl sm:text-4xl text-ink">
            Sample menu
          </h2>
          <p className="mt-3 text-ink-muted">
            A taste of what's on rotation. The menu changes every week, and you choose your dishes for each box.
          </p>
        </div>

        <div className="flex gap-2 mb-6" role="group" aria-label="Choose a box">
          {SAMPLE_MENU.map((g) => (
            <button
              key={g.box}
              type="button"
              aria-pressed={g.box === active}
              onClick={() => setActive(g.box)}
              className={cn(
                "rounded-full border-2 px-5 py-2 text-sm font-semibold transition-colors cursor-pointer",
                g.box === active ? "border-olive-600 bg-olive-600 text-white" : "border-border bg-surface text-ink hover:border-olive-300"
              )}
            >
              {g.box}
            </button>
          ))}
        </div>

        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {group.items.map((dish) => (
            <li key={dish.image} className="rounded-2xl bg-surface border border-border overflow-hidden shadow-soft">
              <img
                src={dish.image}
                alt={dish.name}
                loading="lazy"
                width={800}
                height={800}
                className="aspect-square w-full object-cover"
              />
              <p className="px-4 py-3 text-sm font-medium text-ink leading-snug">{dish.name}</p>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <Button asChild variant="primary" size="md">
            <Link to="/subscribe">
              Start your plan <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

export { SampleMenu }
