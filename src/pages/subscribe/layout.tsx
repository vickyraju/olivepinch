import { Link, Outlet, useLocation } from "react-router-dom"
import { SubscribeProvider } from "@/lib/subscribe-context"
import { ProgressStepper } from "@/components/ui/progress-stepper"
import { Logo } from "@/components/ui/logo"
import { PHASES, phaseIndex } from "./steps"

function SubscribeLayoutInner() {
  const location = useLocation()
  const current = phaseIndex(location.pathname)

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-border bg-surface">
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="shrink-0">
            <Logo className="text-lg" />
          </Link>
          <div className="hidden sm:block sm:absolute sm:left-1/2 sm:-translate-x-1/2">
            <ProgressStepper phases={PHASES} current={current} />
          </div>
          <div className="sm:hidden">
            <ProgressStepper phases={PHASES} current={current} />
          </div>
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
