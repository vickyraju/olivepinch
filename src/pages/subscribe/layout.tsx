import { Link, Outlet, useLocation } from "react-router-dom"
import { SubscribeProvider } from "@/lib/subscribe-context"
import { ProgressStepper } from "@/components/ui/progress-stepper"
import { Logo } from "@/components/ui/logo"
import { PHASES, phaseIndex, stepIndexInPhase } from "./steps"

function SubscribeLayoutInner() {
  const location = useLocation()
  const currentPhase = phaseIndex(location.pathname)
  const currentStep = stepIndexInPhase(location.pathname)

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-4 grid grid-cols-[auto_1fr] sm:grid-cols-[1fr_auto_1fr] items-center gap-4">
          <Link to="/" className="shrink-0 justify-self-start">
            <Logo className="text-lg" />
          </Link>
          <div className="justify-self-end sm:justify-self-center">
            <ProgressStepper phases={PHASES} currentPhase={currentPhase} currentStep={currentStep} />
          </div>
          <div className="hidden sm:block" aria-hidden />
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
