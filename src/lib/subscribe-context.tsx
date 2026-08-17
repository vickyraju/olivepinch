import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { DietType, Goal, MealSlot } from "@/data/menu"
import { SLOTS_BY_MEALS_PER_DAY, defaultMenuFor } from "@/data/menu"
import { toDateKey, fromDateKey } from "@/lib/subscription"
import { useAuth } from "@/lib/auth"
import { SUBSCRIBE_STORAGE_KEY as STORAGE_KEY } from "@/lib/subscribe-storage"

export type PlanDuration = 7 | 14 | 28
export type MealsPerDay = 1 | 2 | 3
export type Gender = "Female" | "Male" | "Non-binary" | "Prefer not to say"

export interface CustomerProfile {
  fullName: string
  email: string
  gender: Gender | ""
  age: string
  heightCm: string
  weightKg: string
}

export interface DayMenu {
  date: string
  items: string[] // menu item ids, indexed by slot order for mealsPerDay
}

export interface SubscribeState {
  postcode: string
  postcodeConfirmed: boolean
  planDuration: PlanDuration
  startDate: string | null
  profile: CustomerProfile
  goal: Goal | null
  dietTypes: DietType[]
  allergens: string[]
  noAllergies: boolean
  mealsPerDay: MealsPerDay
  useDefaultMenu: boolean
  dayMenus: DayMenu[]
  deliveryAddress: string
  paymentAttempted: boolean
  customerId: string | null
  subscriptionId: string | null
}

const EMPTY_PROFILE: CustomerProfile = {
  fullName: "",
  email: "",
  gender: "",
  age: "",
  heightCm: "",
  weightKg: "",
}

const INITIAL_STATE: SubscribeState = {
  postcode: "",
  postcodeConfirmed: false,
  planDuration: 7,
  startDate: null,
  profile: EMPTY_PROFILE,
  goal: null,
  dietTypes: [],
  allergens: [],
  noAllergies: false,
  mealsPerDay: 2,
  useDefaultMenu: true,
  dayMenus: [],
  deliveryAddress: "",
  paymentAttempted: false,
  customerId: null,
  subscriptionId: null,
}

interface SubscribeContextValue {
  state: SubscribeState
  update: (patch: Partial<SubscribeState>) => void
  buildDayMenus: () => void
  resetMenuToDefaults: () => void
  reset: () => void
}

const SubscribeContext = createContext<SubscribeContextValue | null>(null)

function loadInitial(): SubscribeState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return INITIAL_STATE
    return { ...INITIAL_STATE, ...JSON.parse(raw) }
  } catch {
    return INITIAL_STATE
  }
}

export function SubscribeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SubscribeState>(loadInitial)
  const { customer } = useAuth()

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  // A social sign-in started mid-funnel (account-setup.tsx) completes asynchronously via the
  // global auth listener, which has no reference to this provider's in-memory state — it can
  // only write the resulting customerId to sessionStorage directly. Pick that up here once the
  // auth side confirms it, rather than leaving this provider's state stale.
  useEffect(() => {
    if (!customer || state.customerId === customer.id) return
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const stored = raw ? (JSON.parse(raw) as SubscribeState) : null
    if (stored?.customerId === customer.id) {
      setState((s) => ({ ...s, customerId: customer.id, profile: { ...s.profile, email: customer.email } }))
    }
  }, [customer, state.customerId])

  const update = (patch: Partial<SubscribeState>) => setState((s) => ({ ...s, ...patch }))

  const buildDayMenus = () => {
    setState((s) => {
      if (!s.goal || s.dietTypes.length === 0 || !s.startDate) return s
      const slots = SLOTS_BY_MEALS_PER_DAY[s.mealsPerDay]
      const start = fromDateKey(s.startDate)
      const dayMenus: DayMenu[] = Array.from({ length: s.planDuration }, (_, i) => {
        const date = new Date(start)
        date.setDate(start.getDate() + i)
        return {
          date: toDateKey(date),
          items: slots.map((slot: MealSlot) => defaultMenuFor(s.goal!, s.dietTypes, s.allergens, slot).id),
        }
      })
      return { ...s, dayMenus }
    })
  }

  const resetMenuToDefaults = () => {
    setState((s) => {
      if (!s.goal || s.dietTypes.length === 0) return s
      const slots = SLOTS_BY_MEALS_PER_DAY[s.mealsPerDay]
      return {
        ...s,
        dayMenus: s.dayMenus.map((day) => ({
          ...day,
          items: slots.map((slot: MealSlot) => defaultMenuFor(s.goal!, s.dietTypes, s.allergens, slot).id),
        })),
      }
    })
  }

  const reset = () => {
    sessionStorage.removeItem(STORAGE_KEY)
    setState(INITIAL_STATE)
  }

  const value = useMemo(
    () => ({ state, update, buildDayMenus, resetMenuToDefaults, reset }),
    [state]
  )

  return <SubscribeContext.Provider value={value}>{children}</SubscribeContext.Provider>
}

export function useSubscribe() {
  const ctx = useContext(SubscribeContext)
  if (!ctx) throw new Error("useSubscribe must be used within SubscribeProvider")
  return ctx
}
