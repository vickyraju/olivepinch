export interface SubStep {
  path: string
  label: string
}

export interface Phase {
  name: string
  steps: SubStep[]
}

export const PHASES: Phase[] = [
  {
    name: "Choose",
    steps: [
      { path: "/subscribe", label: "Postcode" },
      { path: "/subscribe/plan", label: "Plan" },
      { path: "/subscribe/profile", label: "Profile" },
    ],
  },
  {
    name: "Review",
    steps: [
      { path: "/subscribe/goal", label: "Goal" },
      { path: "/subscribe/preferences", label: "Preferences" },
      { path: "/subscribe/meals", label: "Meals/Day" },
    ],
  },
  {
    name: "Confirm",
    steps: [
      { path: "/subscribe/menu", label: "Menu" },
      { path: "/subscribe/payment", label: "Payment" },
      { path: "/subscribe/account", label: "Account" },
    ],
  },
]

export const FUNNEL_STEPS: SubStep[] = PHASES.flatMap((p) => p.steps)

export function stepIndex(pathname: string): number {
  const i = FUNNEL_STEPS.findIndex((s) => s.path === pathname)
  return i === -1 ? 0 : i
}

export function phaseIndex(pathname: string): number {
  for (let i = 0; i < PHASES.length; i++) {
    if (PHASES[i].steps.some((s) => s.path === pathname)) {
      return i
    }
  }
  return 0
}

export function stepIndexInPhase(pathname: string): number {
  const phase = PHASES[phaseIndex(pathname)]
  const index = phase.steps.findIndex((s) => s.path === pathname)
  return index === -1 ? 0 : index
}
