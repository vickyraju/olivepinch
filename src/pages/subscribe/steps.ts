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
      { path: "/subscribe/goal", label: "Goal" },
      { path: "/subscribe/preferences", label: "Preferences" },
      { path: "/subscribe/meals", label: "Meals/Day" },
      { path: "/subscribe/plan", label: "Plan" },
      { path: "/subscribe/menu", label: "Menu" },
    ],
  },
  {
    name: "Review",
    steps: [
      { path: "/subscribe/profile", label: "Profile" },
      { path: "/subscribe/account-setup", label: "Account" },
      { path: "/subscribe/delivery", label: "Delivery" },
    ],
  },
  {
    name: "Confirm",
    steps: [
      { path: "/subscribe/payment", label: "Payment" },
      { path: "/subscribe/account", label: "Verify" },
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
