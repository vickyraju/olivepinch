import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { DietType, Goal } from "@/data/menu"
import { computeEndDate, pausesUsedThisMonth, MAX_PAUSES_PER_MONTH } from "@/lib/subscription"

export interface HealthLog {
  id: string
  date: string
  heightCm: number
  weightKg: number
  chestCm: number
  bicepCm: number
  abdomenCm: number
  waistCm: number
}

export interface Subscription {
  status: "active" | "expired"
  planDuration: 7 | 14 | 28
  startDate: string
  mealsPerDay: 1 | 2 | 3
  goal: Goal
  dietType: DietType
  allergens: string[]
  pausedDates: string[]
}

export interface DashboardCustomer {
  name: string
  email: string
  age: number
  marketingOptIn: boolean
  subscription: Subscription
  healthLogs: HealthLog[]
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

const SEED: DashboardCustomer = {
  name: "Amelia Clarke",
  email: "amelia.clarke@example.com",
  age: 29,
  marketingOptIn: false,
  subscription: {
    status: "active",
    planDuration: 14,
    startDate: daysAgo(4),
    mealsPerDay: 3,
    goal: "Muscle Building",
    dietType: "Meat",
    allergens: ["Shellfish"],
    pausedDates: [daysFromNow(3)],
  },
  healthLogs: [
    { id: "h1", date: daysAgo(28), heightCm: 167, weightKg: 64.2, chestCm: 92, bicepCm: 27, abdomenCm: 76, waistCm: 71 },
    { id: "h2", date: daysAgo(14), heightCm: 167, weightKg: 63.6, chestCm: 92, bicepCm: 27.3, abdomenCm: 75, waistCm: 70 },
    { id: "h3", date: daysAgo(2), heightCm: 167, weightKg: 63.0, chestCm: 93, bicepCm: 27.6, abdomenCm: 74, waistCm: 69 },
  ],
}

const STORAGE_KEY = "olivepinch.dashboard"

interface DashboardContextValue {
  customer: DashboardCustomer
  addHealthLog: (log: Omit<HealthLog, "id">) => void
  togglePause: (date: string) => { ok: boolean; reason?: string }
  renew: (planDuration: 7 | 14 | 28) => void
  updateMarketingOptIn: (value: boolean) => void
  deleteAccount: () => void
  endDate: string
  pausesUsed: number
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

function loadInitial(): DashboardCustomer {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return SEED
    return JSON.parse(raw)
  } catch {
    return SEED
  }
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<DashboardCustomer>(loadInitial)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customer))
  }, [customer])

  const addHealthLog = (log: Omit<HealthLog, "id">) => {
    setCustomer((c) => ({
      ...c,
      healthLogs: [{ ...log, id: crypto.randomUUID() }, ...c.healthLogs],
    }))
  }

  const togglePause = (date: string) => {
    const sub = customer.subscription
    const alreadyPaused = sub.pausedDates.includes(date)
    if (!alreadyPaused && pausesUsedThisMonth(sub.pausedDates) >= MAX_PAUSES_PER_MONTH) {
      return { ok: false, reason: `You've used all ${MAX_PAUSES_PER_MONTH} pauses for this month.` }
    }
    setCustomer((c) => ({
      ...c,
      subscription: {
        ...c.subscription,
        pausedDates: alreadyPaused
          ? c.subscription.pausedDates.filter((d) => d !== date)
          : [...c.subscription.pausedDates, date],
      },
    }))
    return { ok: true }
  }

  const renew = (planDuration: 7 | 14 | 28) => {
    setCustomer((c) => ({
      ...c,
      subscription: {
        ...c.subscription,
        status: "active",
        planDuration,
        startDate: new Date().toISOString().slice(0, 10),
        pausedDates: [],
      },
    }))
  }

  const updateMarketingOptIn = (value: boolean) => {
    setCustomer((c) => ({ ...c, marketingOptIn: value }))
  }

  const deleteAccount = () => {
    localStorage.removeItem(STORAGE_KEY)
    setCustomer(SEED)
  }

  const endDate = computeEndDate(
    customer.subscription.startDate,
    customer.subscription.planDuration,
    customer.subscription.pausedDates
  )
  const pausesUsed = pausesUsedThisMonth(customer.subscription.pausedDates)

  const value = useMemo(
    () => ({ customer, addHealthLog, togglePause, renew, updateMarketingOptIn, deleteAccount, endDate, pausesUsed }),
    [customer, endDate, pausesUsed]
  )

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider")
  return ctx
}
