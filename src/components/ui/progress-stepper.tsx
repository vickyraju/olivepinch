import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Phase {
  name: string
  steps: { label: string }[]
}

function ProgressStepper({
  phases,
  currentPhase,
  currentStep,
}: {
  phases: Phase[]
  currentPhase: number
  currentStep: number
}) {
  return (
    <nav aria-label="Progress" className="w-full overflow-x-auto flex justify-center">
      <ol className="flex items-center gap-2 sm:gap-4 px-1 py-2">
        {phases.map((phase, phaseIdx) => {
          const phaseIsDone = currentPhase > phaseIdx
          const phaseIsCurrent = currentPhase === phaseIdx
          const phaseState = phaseIsDone ? "done" : phaseIsCurrent ? "current" : "upcoming"
          // Fraction of this phase's sub-steps completed so far — only meaningful while it's
          // the active phase; done phases render fully filled, upcoming ones empty.
          const fraction = phaseIsCurrent ? Math.min(currentStep / phase.steps.length, 1) : 0

          return (
            <li key={phase.name} className="flex items-center gap-2 sm:gap-4">
              <div className="flex flex-col items-center gap-1">
                <span
                  aria-current={phaseState === "current" ? "step" : undefined}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                    phaseState === "done" && "bg-olive-600 text-white",
                    phaseState === "current" && "bg-olive-600 text-white",
                    phaseState === "upcoming" && "bg-cream-100 text-ink-muted"
                  )}
                >
                  {phaseState === "done" ? <Check className="h-5 w-5" /> : phaseIdx + 1}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold whitespace-nowrap hidden sm:inline",
                    phaseState === "upcoming" ? "text-ink-muted" : "text-ink"
                  )}
                >
                  {phase.name}
                </span>
              </div>
              {phaseIdx < phases.length - 1 && (
                <span aria-hidden className="relative h-0.5 w-6 sm:w-10 shrink-0 overflow-hidden rounded-full">
                  {phaseState === "done" && <span className="absolute inset-0 bg-olive-600" />}
                  {phaseState === "upcoming" && <span className="absolute inset-0 bg-cream-100" />}
                  {phaseState === "current" && (
                    <>
                      <span
                        className="absolute inset-0 bg-[repeating-linear-gradient(to_right,var(--color-border)_0,var(--color-border)_3px,transparent_3px,transparent_6px)]"
                      />
                      <span
                        className="absolute inset-y-0 left-0 bg-olive-600 transition-[width] duration-300"
                        style={{ width: `${fraction * 100}%` }}
                      />
                    </>
                  )}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export { ProgressStepper }
