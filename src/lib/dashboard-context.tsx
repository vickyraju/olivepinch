import { createContext, useContext, useCallback, useMemo, useState, useEffect, type ReactNode } from "react"
import type { DietType, Goal } from "@/data/menu"
import type { DeliverySlot, DeliveryTimeSlot, DeliveryAddress } from "@/lib/subscribe-context"
import { computeEndDate, pausesUsedTotal, canPauseDate, toDateKey, PAUSE_LIMITS_BY_DURATION, type OrderStatus } from "@/lib/subscription"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { goalFromEnum, dietTypesFromEnum, mealSlotFromEnum, deliverySlotFromEnum, deliveryTimeSlotFromEnum, GOAL_TO_ENUM, DIET_TO_ENUM, DELIVERY_SLOT_TO_ENUM, DELIVERY_TIME_SLOT_TO_ENUM, orderStatusFromEnum, subscriptionStatusFromEnum } from "@/lib/enum-map"

export interface HealthLog {
  id: string
  date: string
  loggedAt: string
  heightCm: number
  weightKg: number
  chestCm: number
  bicepCm: number
  abdomenCm: number
  waistCm: number
}

export interface OrderDay {
  id: string
  date: string
  status: OrderStatus
  menuChosenAt: string | null
  items: { id: string; name: string; slot: string }[]
}

export interface Subscription {
  id: string
  status: "active" | "expired"
  planDuration: 7 | 14 | 28
  startDate: string
  mealsPerDay: 1 | 2 | 3
  goal: Goal
  dietTypes: DietType[]
  allergens: string[]
  pausedDates: string[]
  deliverySlot: DeliverySlot
  deliveryTimeSlot: DeliveryTimeSlot
  orders: OrderDay[]
}

export interface DashboardCustomer {
  name: string
  email: string
  phone: string
  dateOfBirth: string
  address: DeliveryAddress
  marketingOptIn: boolean
  subscription: Subscription
  healthLogs: HealthLog[]
}

interface RawSubscription {
  id: string
  status: "PENDING_PAYMENT" | "ACTIVE" | "EXPIRED"
  planDuration: 7 | 14 | 28
  startDate: string
  mealsPerDay: 1 | 2 | 3
  pausedDates: string[]
  deliverySlot: string
  deliveryTimeSlot: string
  orders: {
    id: string
    deliveryDate: string
    status: string
    menuChosenAt: string | null
    items: { slot: string; menuItem: { id: string; name: string } }[]
  }[]
}

/** SCHEDULED never advances on its own in this pilot (no ops staff/cron flips it) — derive a
 * sane display status from the delivery date once nothing has explicitly overridden it. */
function displayStatusFor(deliveryDateIso: string, backendStatus: string): OrderStatus {
  if (backendStatus !== "SCHEDULED") return orderStatusFromEnum(backendStatus)
  const today = toDateKey(new Date())
  if (deliveryDateIso < today) return "Delivered"
  if (deliveryDateIso === today) return "Out for Delivery"
  return "Scheduled"
}

function mapSubscription(raw: RawSubscription, goal: Goal, dietTypes: DietType[], allergens: string[]): Subscription {
  return {
    id: raw.id,
    status: subscriptionStatusFromEnum(raw.status),
    planDuration: raw.planDuration,
    startDate: raw.startDate.slice(0, 10),
    mealsPerDay: raw.mealsPerDay,
    goal,
    dietTypes,
    allergens,
    pausedDates: raw.pausedDates.map((d) => d.slice(0, 10)),
    deliverySlot: deliverySlotFromEnum(raw.deliverySlot),
    deliveryTimeSlot: deliveryTimeSlotFromEnum(raw.deliveryTimeSlot),
    orders: raw.orders.map((o) => ({
      id: o.id,
      date: o.deliveryDate.slice(0, 10),
      status: displayStatusFor(o.deliveryDate.slice(0, 10), o.status),
      menuChosenAt: o.menuChosenAt,
      items: o.items.map((i) => ({ id: i.menuItem.id, name: i.menuItem.name, slot: mealSlotFromEnum(i.slot) })),
    })),
  }
}

interface DashboardContextValue {
  customer: DashboardCustomer
  addHealthLog: (log: Omit<HealthLog, "id" | "date" | "loggedAt">) => Promise<void>
  deleteHealthLog: (id: string) => Promise<void>
  togglePause: (date: string) => Promise<{ ok: boolean; reason?: string }>
  pauseMultiple: (dates: string[]) => Promise<{ ok: boolean; reason?: string }>
  renew: (planDuration: 7 | 14 | 28, mealsPerDay: 1 | 2 | 3, goal: Goal, dietTypes: DietType[], allergens: string[], deliverySlot: DeliverySlot, deliveryTimeSlot: DeliveryTimeSlot, promoCode?: string) => Promise<void>
  confirmRenewal: () => Promise<void>
  updateMarketingOptIn: (value: boolean) => Promise<void>
  updateAddress: (address: DeliveryAddress, phone: string) => Promise<{ ok: boolean; reason?: string }>
  chooseMenuWeek: (weekStart: string, dayItems: { date: string; items: string[] }[]) => Promise<{ ok: boolean; reason?: string }>
  deleteAccount: () => Promise<void>
  endDate: string
  pausesUsed: number
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

function DashboardProviderInner({ initial, refetch, children }: { initial: DashboardCustomer; refetch: () => Promise<DashboardCustomer>; children: ReactNode }) {
  const { logout } = useAuth()
  const [customer, setCustomer] = useState<DashboardCustomer>(initial)

  const addHealthLog = useCallback(async (log: Omit<HealthLog, "id" | "date" | "loggedAt">) => {
    const created = await api.post<{ id: string; loggedAt: string } & Omit<HealthLog, "id" | "date" | "loggedAt">>("/health-logs", log)
    setCustomer((c) => ({
      ...c,
      healthLogs: [{ ...log, id: created.id, date: created.loggedAt.slice(0, 10), loggedAt: created.loggedAt }, ...c.healthLogs],
    }))
  }, [])

  const deleteHealthLog = useCallback(async (id: string) => {
    await api.del(`/health-logs/${id}`)
    setCustomer((c) => ({ ...c, healthLogs: c.healthLogs.filter((h) => h.id !== id) }))
  }, [])

  const togglePause = useCallback(
    async (date: string) => {
      const sub = customer.subscription
      const alreadyPaused = sub.pausedDates.includes(date)
      if (!canPauseDate(date)) {
        return { ok: false, reason: "Changes to this day must be made by noon the day before." }
      }
      const limit = PAUSE_LIMITS_BY_DURATION[sub.planDuration]
      if (!alreadyPaused && pausesUsedTotal(sub.pausedDates) >= limit) {
        return { ok: false, reason: `You've used all ${limit} pauses for this plan.` }
      }
      try {
        await api.post(`/subscriptions/${sub.id}/${alreadyPaused ? "resume" : "pause"}`, { date })
        setCustomer(await refetch())
        return { ok: true }
      } catch (err) {
        return { ok: false, reason: err instanceof ApiError ? err.message : "Couldn't update that day — try again." }
      }
    },
    [customer.subscription, refetch]
  )

  // Pauses several days in one action (e.g. a whole week off) — sequential awaited calls to
  // the same single-date endpoint rather than a new backend route, since each call commits to
  // the DB before the next runs, so the server's own per-call budget check still can't be
  // exceeded even without a refetch in between.
  const pauseMultiple = useCallback(
    async (dates: string[]) => {
      const sub = customer.subscription
      if (dates.some((d) => !canPauseDate(d))) {
        return { ok: false, reason: "Changes to those days must be made by noon the day before." }
      }
      const remaining = PAUSE_LIMITS_BY_DURATION[sub.planDuration] - pausesUsedTotal(sub.pausedDates)
      if (dates.length > remaining) {
        return { ok: false, reason: `You can only pause ${remaining} more day${remaining === 1 ? "" : "s"} on this plan.` }
      }
      try {
        for (const date of dates) {
          await api.post(`/subscriptions/${sub.id}/pause`, { date })
        }
        setCustomer(await refetch())
        return { ok: true }
      } catch (err) {
        setCustomer(await refetch())
        return { ok: false, reason: err instanceof ApiError ? err.message : "Couldn't pause those days — try again." }
      }
    },
    [customer.subscription, refetch]
  )

  const confirmRenewal = useCallback(async () => {
    await api.post("/payments/confirm", { subscriptionId: customer.subscription.id })
    setCustomer(await refetch())
  }, [customer.subscription.id, refetch])

  const renew = useCallback(
    async (planDuration: 7 | 14 | 28, mealsPerDay: 1 | 2 | 3, goal: Goal, dietTypes: DietType[], allergens: string[], deliverySlot: DeliverySlot, deliveryTimeSlot: DeliveryTimeSlot, promoCode?: string) => {
      const { subscriptionId } = await api.post<{ subscriptionId: string }>(`/subscriptions/${customer.subscription.id}/renew`, {
        planDuration,
        mealsPerDay,
        goal: GOAL_TO_ENUM[goal],
        dietTypes: dietTypes.map((d) => DIET_TO_ENUM[d]),
        allergens,
        deliverySlot: DELIVERY_SLOT_TO_ENUM[deliverySlot],
        deliveryTimeSlot: DELIVERY_TIME_SLOT_TO_ENUM[deliveryTimeSlot],
        promoCode: promoCode || undefined,
      })
      // Same intent endpoint initial checkout uses — the only place that decides real
      // Worldpay vs. dev-mode auto-succeed, so renewal reuses it rather than faking success.
      // Redirects back to this same page rather than the funnel's payment-return page.
      const intent = await api.post<{ devMode?: boolean; redirectUrl?: string }>("/payments/intent", {
        subscriptionId,
        returnPath: "/dashboard/subscription?renewalPending=1",
      })

      if (intent.devMode) {
        await api.post("/payments/confirm", { subscriptionId })
        setCustomer(await refetch())
        return
      }

      // Leaves the site — never resolves; the page navigates away before this matters.
      window.location.href = intent.redirectUrl!
    },
    [customer.subscription.id, refetch]
  )

  const updateMarketingOptIn = useCallback(async (value: boolean) => {
    await api.patch("/customers/me", { marketingOptIn: value })
    setCustomer((c) => ({ ...c, marketingOptIn: value }))
  }, [])

  const updateAddress = useCallback(async (address: DeliveryAddress, phone: string) => {
    try {
      await api.patch("/customers/me/address", {
        phone,
        addressDoorNumber: address.doorNumber,
        addressBuildingName: address.buildingName || undefined,
        addressStreet: address.street,
        addressArea: address.area,
        addressPostcode: address.postcode,
      })
      setCustomer((c) => ({ ...c, address, phone }))
      return { ok: true }
    } catch (err) {
      return { ok: false, reason: err instanceof ApiError ? err.message : "Couldn't save your address — try again." }
    }
  }, [])

  const chooseMenuWeek = useCallback(
    async (weekStart: string, dayItems: { date: string; items: string[] }[]) => {
      try {
        await api.patch(`/subscriptions/${customer.subscription.id}/menu-weeks/${weekStart}`, { dayItems })
        setCustomer(await refetch())
        return { ok: true }
      } catch (err) {
        return { ok: false, reason: err instanceof ApiError ? err.message : "Couldn't save your menu choices — try again." }
      }
    },
    [customer.subscription.id, refetch]
  )

  const deleteAccount = useCallback(async () => {
    await api.del("/customers/me")
    await logout()
  }, [logout])

  const endDate = computeEndDate(customer.subscription.startDate, customer.subscription.planDuration, customer.subscription.pausedDates)
  const pausesUsed = pausesUsedTotal(customer.subscription.pausedDates)

  const value = useMemo(
    () => ({ customer, addHealthLog, deleteHealthLog, togglePause, pauseMultiple, renew, confirmRenewal, updateMarketingOptIn, updateAddress, chooseMenuWeek, deleteAccount, endDate, pausesUsed }),
    [customer, addHealthLog, deleteHealthLog, togglePause, pauseMultiple, renew, confirmRenewal, updateMarketingOptIn, updateAddress, chooseMenuWeek, deleteAccount, endDate, pausesUsed]
  )

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: DashboardCustomer }>({
    status: "loading",
  })

  const load = useCallback(async (): Promise<DashboardCustomer> => {
    const [me, rawSub, healthLogs] = await Promise.all([
      api.get<{
        fullName: string
        email: string
        phone: string | null
        dateOfBirth: string | null
        addressDoorNumber: string | null
        addressBuildingName: string | null
        addressStreet: string | null
        addressArea: string | null
        addressPostcode: string | null
        marketingOptIn: boolean
        goal: string
        dietTypes: string[]
        allergens: string[]
      }>("/customers/me"),
      api.get<RawSubscription>("/subscriptions/current"),
      api.get<{ id: string; heightCm: number; weightKg: number; chestCm: number; bicepCm: number; abdomenCm: number; waistCm: number; loggedAt: string }[]>(
        "/health-logs"
      ),
    ])

    return {
      name: me.fullName,
      email: me.email,
      phone: me.phone ?? "",
      dateOfBirth: me.dateOfBirth?.slice(0, 10) ?? "",
      address: {
        doorNumber: me.addressDoorNumber ?? "",
        buildingName: me.addressBuildingName ?? "",
        street: me.addressStreet ?? "",
        area: me.addressArea ?? "",
        postcode: me.addressPostcode ?? "",
      },
      marketingOptIn: me.marketingOptIn,
      // goal/dietTypes/allergens live on the customer, not the subscription
      subscription: mapSubscription(rawSub, goalFromEnum(me.goal), dietTypesFromEnum(me.dietTypes), me.allergens),
      healthLogs: healthLogs.map((h) => ({ ...h, date: h.loggedAt.slice(0, 10) })),
    }
  }, [])

  useEffect(() => {
    load()
      .then((data) => setState({ status: "ready", data }))
      .catch((err) => setState({ status: "error", message: err instanceof ApiError ? err.message : "Couldn't load your dashboard — try refreshing." }))
  }, [load])

  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 rounded-full border-2 border-olive-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="max-w-md mx-auto py-24 text-center">
        <p className="text-ink font-medium mb-2">Couldn't load your dashboard</p>
        <p className="text-sm text-ink-muted">{state.message}</p>
      </div>
    )
  }

  return (
    <DashboardProviderInner initial={state.data} refetch={load}>
      {children}
    </DashboardProviderInner>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider")
  return ctx
}
