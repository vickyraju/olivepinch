import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

function FinalCta() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="rounded-[20px] bg-olive-600 px-8 py-16 sm:px-16 sm:py-20 text-center">
          <p className="eyebrow mb-4 text-olive-100">Ready when you are</p>
          <h2 className="text-3xl sm:text-4xl text-white">
            Ready to eat better <em>this week</em>?
          </h2>
          <p className="mt-3 text-olive-100 max-w-md mx-auto">
            Check your postcode and set up your first plan in a few minutes.
          </p>
          <Button asChild variant="surface" size="lg" className="mt-8">
            <Link to="/subscribe">Check your postcode</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

export { FinalCta }
