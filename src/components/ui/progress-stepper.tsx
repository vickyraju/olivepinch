import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Phase {
  name: string
  steps: { label: string }[]
}

function ProgressStepper({ phases, current }: { phases: Phase[]; current: number }) {
  let stepsSoFar = 0
  const currentPhaseIndex = phases.findIndex((p) => {
    const nextStepsSoFar = stepsSoFar + p.steps.length
    if (current < nextStepsSoFar) {
      return true
    }
    stepsSoFar = nextStepsSoFar
    return false
  })

  return (
    <nav aria-label="Progress" className="w-full overflow-x-auto flex justify-center">
      <ol className="flex items-center gap-2 sm:gap-4 px-1 py-2">
        {phases.map((phase, phaseIdx) => {
          const phaseIsDone = currentPhaseIndex > phaseIdx
          const phaseIsCurrent = currentPhaseIndex === phaseIdx
          const phaseState = phaseIsDone ? "done" : phaseIsCurrent ? "current" : "upcoming"

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
                <span
                  aria-hidden
                  className={cn(
                    "h-px shrink-0",
                    phaseIsDone ? "bg-olive-600" : "bg-cream-100",
                    "w-4 sm:w-6"
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export { ProgressStepper }
