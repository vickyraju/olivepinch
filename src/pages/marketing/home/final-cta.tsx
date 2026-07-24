import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { FoodPhoto } from "@/components/ui/food-photo"

function FinalCta() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-olive-600 px-8 py-14 sm:px-16 sm:py-16 grid gap-8 sm:grid-cols-[1fr_auto] items-center">
          <div
            className="absolute inset-0 opacity-40"
            style={{ background: "radial-gradient(circle at 85% 15%, var(--color-olive-500), transparent 60%)" }}
            aria-hidden
          />
          <div className="relative text-center sm:text-left">
            <h2 className="text-3xl sm:text-4xl text-white">Ready to eat better this week?</h2>
            <p className="mt-3 text-olive-100 max-w-md mx-auto sm:mx-0">
              Check your postcode and set up your first plan in a few minutes.
            </p>
            <Button asChild variant="accent" size="lg" className="mt-8">
              <Link to="/subscribe">Check your postcode</Link>
            </Button>
          </div>
          <FoodPhoto seed={2} className="relative hidden sm:block w-40 h-40 rounded-xl rotate-3 shadow-lifted" />
        </div>
      </div>
    </section>
  )
}

export { FinalCta }
