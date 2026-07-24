export interface FunnelStep {
  path: string
  label: string
}

export const FUNNEL_STEPS: FunnelStep[] = [
  { path: "/subscribe", label: "Postcode" },
  { path: "/subscribe/plan", label: "Plan" },
  { path: "/subscribe/profile", label: "Profile" },
  { path: "/subscribe/goal", label: "Goal" },
  { path: "/subscribe/preferences", label: "Preferences" },
  { path: "/subscribe/meals", label: "Meals/Day" },
  { path: "/subscribe/menu", label: "Menu" },
  { path: "/subscribe/payment", label: "Payment" },
  { path: "/subscribe/account", label: "Account" },
]

export function stepIndex(pathname: string): number {
  const i = FUNNEL_STEPS.findIndex((s) => s.path === pathname)
  return i === -1 ? 0 : i
}
