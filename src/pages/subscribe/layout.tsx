import { Link, Outlet, useLocation } from "react-router-dom"
import { SubscribeProvider } from "@/lib/subscribe-context"
import { ProgressStepper } from "@/components/ui/progress-stepper"
import { Logo } from "@/components/ui/logo"
import { FUNNEL_STEPS, stepIndex } from "./steps"

function SubscribeLayoutInner() {
  const location = useLocation()
  const current = stepIndex(location.pathname)

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="shrink-0">
            <Logo className="text-lg" />
          </Link>
          <div className="flex-1 min-w-0">
            <ProgressStepper steps={FUNNEL_STEPS} current={current} />
          </div>
          <Link
            to="/login"
            className="shrink-0 font-body text-sm font-normal text-ink-muted hover:text-olive-600 transition-colors"
          >
            Log in
          </Link>
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
