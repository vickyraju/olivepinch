import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Step {
  label: string
}

function ProgressStepper({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <nav aria-label="Progress" className="w-full overflow-x-auto">
      <ol className="flex items-center gap-1.5 min-w-max px-1 py-2">
        {steps.map((step, i) => {
          const state = i < current ? "done" : i === current ? "current" : "upcoming"
          return (
            <li key={step.label} className="flex items-center gap-1.5">
              <div className="flex items-center gap-2">
                <span
                  aria-current={state === "current" ? "step" : undefined}
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    state === "done" && "bg-olive-600 text-white",
                    state === "current" && "bg-coral-500 text-white",
                    state === "upcoming" && "bg-cream-100 text-ink-muted"
                  )}
                >
                  {state === "done" ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium whitespace-nowrap hidden sm:inline",
                    state === "upcoming" ? "text-ink-muted" : "text-ink"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "h-px w-6 sm:w-10 shrink-0",
                    state === "done" ? "bg-olive-600" : "bg-border"
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
