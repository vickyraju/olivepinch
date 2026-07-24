import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { DietType, Goal, MealSlot } from "@/data/menu"
import { SLOTS_BY_MEALS_PER_DAY, defaultMenuFor } from "@/data/menu"

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
  dietType: DietType | null
  allergens: string[]
  mealsPerDay: MealsPerDay
  useDefaultMenu: boolean
  dayMenus: DayMenu[]
  deliveryAddress: string
  paymentAttempted: boolean
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
  dietType: null,
  allergens: [],
  mealsPerDay: 2,
  useDefaultMenu: true,
  dayMenus: [],
  deliveryAddress: "",
  paymentAttempted: false,
}

const STORAGE_KEY = "olivepinch.subscribe"

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

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const update = (patch: Partial<SubscribeState>) => setState((s) => ({ ...s, ...patch }))

  const buildDayMenus = () => {
    setState((s) => {
      if (!s.goal || !s.dietType || !s.startDate) return s
      const slots = SLOTS_BY_MEALS_PER_DAY[s.mealsPerDay]
      const start = new Date(s.startDate)
      const dayMenus: DayMenu[] = Array.from({ length: s.planDuration }, (_, i) => {
        const date = new Date(start)
        date.setDate(start.getDate() + i)
        return {
          date: date.toISOString().slice(0, 10),
          items: slots.map((slot: MealSlot) => defaultMenuFor(s.goal!, s.dietType!, s.allergens, slot).id),
        }
      })
      return { ...s, dayMenus }
    })
  }

  const resetMenuToDefaults = () => {
    setState((s) => {
      if (!s.goal || !s.dietType) return s
      const slots = SLOTS_BY_MEALS_PER_DAY[s.mealsPerDay]
      return {
        ...s,
        dayMenus: s.dayMenus.map((day) => ({
          ...day,
          items: slots.map((slot: MealSlot) => defaultMenuFor(s.goal!, s.dietType!, s.allergens, slot).id),
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
