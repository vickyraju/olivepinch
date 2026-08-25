import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { DietType, Goal } from "@/data/menu"
import { SUBSCRIBE_STORAGE_KEY as STORAGE_KEY } from "@/lib/subscribe-storage"

export type PlanDuration = 7 | 14 | 28
export type MealsPerDay = 1 | 2 | 3
export type PlanTier = "Basic" | "Advanced"
export type Gender = "Female" | "Male" | "Non-binary" | "Prefer not to say"
export type DeliverySlot = "Daily" | "Weekly" | "Alternate days"

export interface CustomerProfile {
  fullName: string
  email: string
  phone: string
  gender: Gender | ""
  dateOfBirth: string
  heightCm: string
  weightKg: string
}

export interface DeliveryAddress {
  doorNumber: string
  buildingName: string
  street: string
  area: string
  postcode: string
}

export interface DayMenu {
  date: string
  items: string[] // menu item ids, indexed by slot order for mealsPerDay
}

export interface SubscribeState {
  postcode: string
  postcodeConfirmed: boolean
  planDuration: PlanDuration | null
  startDate: string | null
  profile: CustomerProfile
  goal: Goal | null
  tier: PlanTier | null
  dietTypes: DietType[]
  allergens: string[]
  noAllergies: boolean
  mealsPerDay: MealsPerDay | null
  dayMenus: DayMenu[]
  /** Real MenuItem prices encountered while fetching published weeks during the menu step —
   * lets order-summary/payment price the plan without depending on the dayMenus payload shape. */
  menuItemPrices: Record<string, number>
  deliveryAddress: DeliveryAddress
  deliverySlot: DeliverySlot | null
  paymentAttempted: boolean
  customerId: string | null
  subscriptionId: string | null
}

const EMPTY_PROFILE: CustomerProfile = {
  fullName: "",
  email: "",
  phone: "",
  gender: "",
  dateOfBirth: "",
  heightCm: "",
  weightKg: "",
}

const EMPTY_ADDRESS: DeliveryAddress = {
  doorNumber: "",
  buildingName: "",
  street: "",
  area: "",
  postcode: "",
}

const INITIAL_STATE: SubscribeState = {
  postcode: "",
  postcodeConfirmed: false,
  planDuration: null,
  startDate: null,
  profile: EMPTY_PROFILE,
  goal: null,
  tier: null,
  dietTypes: [],
  allergens: [],
  noAllergies: false,
  mealsPerDay: null,
  dayMenus: [],
  menuItemPrices: {},
  deliveryAddress: EMPTY_ADDRESS,
  deliverySlot: null,
  paymentAttempted: false,
  customerId: null,
  subscriptionId: null,
}

interface SubscribeContextValue {
  state: SubscribeState
  update: (patch: Partial<SubscribeState>) => void
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

  const reset = () => {
    sessionStorage.removeItem(STORAGE_KEY)
    setState(INITIAL_STATE)
  }

  const value = useMemo(
    () => ({ state, update, reset }),
    [state]
  )

  return <SubscribeContext.Provider value={value}>{children}</SubscribeContext.Provider>
}

export function useSubscribe() {
  const ctx = useContext(SubscribeContext)
  if (!ctx) throw new Error("useSubscribe must be used within SubscribeProvider")
  return ctx
}
