import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { DietType, Goal } from "@/data/menu"
import { useAuth } from "@/lib/auth"
import { SUBSCRIBE_STORAGE_KEY as STORAGE_KEY } from "@/lib/subscribe-storage"

export type PlanDuration = 7 | 14 | 28
export type MealsPerDay = 1 | 2 | 3
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
  planDuration: PlanDuration
  startDate: string | null
  profile: CustomerProfile
  goal: Goal | null
  dietTypes: DietType[]
  allergens: string[]
  noAllergies: boolean
  mealsPerDay: MealsPerDay
  dayMenus: DayMenu[]
  /** Real MenuItem prices encountered while fetching published weeks during the menu step —
   * lets order-summary/payment price the plan without depending on the dayMenus payload shape. */
  menuItemPrices: Record<string, number>
  deliveryAddress: DeliveryAddress
  deliverySlot: DeliverySlot
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
  planDuration: 7,
  startDate: null,
  profile: EMPTY_PROFILE,
  goal: null,
  dietTypes: [],
  allergens: [],
  noAllergies: false,
  mealsPerDay: 2,
  dayMenus: [],
  menuItemPrices: {},
  deliveryAddress: EMPTY_ADDRESS,
  deliverySlot: "Daily",
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
