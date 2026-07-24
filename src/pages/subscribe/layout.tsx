import { Link, Outlet, useLocation } from "react-router-dom"
import { SubscribeProvider } from "@/lib/subscribe-context"
import { ProgressStepper } from "@/components/ui/progress-stepper"
import { FUNNEL_STEPS, stepIndex } from "./steps"

function SubscribeLayoutInner() {
  const location = useLocation()
  const current = stepIndex(location.pathname)

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="font-display text-lg font-extrabold text-olive-700 shrink-0">
            Olive<span className="text-coral-500">Pinch</span>
          </Link>
          <ProgressStepper steps={FUNNEL_STEPS} current={current} />
        </div>
      </header>
      <main className="flex-1 bg-cream">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-10 sm:py-14">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function SubscribeLayout() {
  return (
    <SubscribeProvider>
      <SubscribeLayoutInner />
    </SubscribeProvider>
  )
}

export default SubscribeLayout
