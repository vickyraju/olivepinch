import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Header } from "@/components/header"
import { QueryError } from "@/components/query-error"
import { api, ApiError } from "@/lib/api"
import { formatGBP } from "@/lib/currency"
import { ACCOUNT_STATUS_STYLES, ORDER_STATUS_STYLES, SUBSCRIPTION_STATUS_STYLES, formatPhone } from "@/lib/status-styles"
import { DIET_LABELS, GOAL_LABELS, ageFromDateOfBirth } from "@/lib/customer-labels"
import { EditCustomerModal, type EditResult } from "@/components/edit-customer-modal"
import { CancelModal, DeliveryModal, MealsModal } from "@/components/edit-subscription-modals"

interface OrderItemRow {
  slot: string
  menuItem: { id: string; name: string }
}

interface OrderRow {
  id: string
  deliveryDate: string
  status: string
  menuChosenAt: string | null
  items: OrderItemRow[]
}

interface Subscription {
  id: string
  planDuration: number
  startDate: string
  mealsPerDay: number
  endDate: string
  deliverySlot: string
  deliveryTimeSlot: string
  status: string
  pausedDates: string[]
  createdAt: string
  cancelledAt: string | null
  cancellationReason: string | null
  orders: OrderRow[]
}

interface Payment {
  id: string
  amount: string
  status: string
  createdAt: string
  subscriptionId: string | null
  refundedAmount: string | null
}

interface PlanSummary {
  planDuration: number
  tier: string
  mealsPerDay: number
}

interface Renewal {
  subscriptionId: string
  renewedAt: string
  previous: PlanSummary
  current: PlanSummary
  amountPaid: number
  discountAmount: number
  daysBeforePreviousEnd: number
}

interface CustomerDetail {
  id: string
  fullName: string
  email: string
  phone: string | null
  gender: string | null
  dateOfBirth: string | null
  heightCm: number | null
  weightKg: number | null
  goal: string | null
  dietTypes: string[]
  allergens: string[]
  addressDoorNumber: string | null
  addressBuildingName: string | null
  addressStreet: string | null
  addressArea: string | null
  addressPostcode: string | null
  marketingOptIn: boolean
  postcode: string | null
  address: string | null
  accountStatus: string
  subscriptions: Subscription[]
  payments: Payment[]
  renewals: Renewal[]
  planEndDate: string | null
  planStatus: string | null
  planCancelledAt: string | null
}

interface AuditLogEntry {
  id: string
  action: string
  detail: string | null
  createdAt: string
  admin: { name: string; email: string }
}

interface ActivityEntry {
  id: string
  action: string
  detail: string | null
  createdAt: string
}

const ACTIVITY_LABELS: Record<string, string> = {
  "address-changed": "Changed address / phone",
  pause: "Paused a delivery",
  resume: "Resumed a delivery",
  "menu-chosen": "Chose meals",
  "renewal-started": "Started a renewal",
  "marketing-opt-in": "Marketing preference",
  "health-entry-added": "Added health entry",
  "health-entry-deleted": "Removed health entry",
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  "pause-override": "Pause override",
  refund: "Refund",
  reactivate: "Reactivate",
  "cancel-subscription": "Cancel subscription",
  "customer-edit": "Details edited",
  "subscription-edit": "Delivery edited",
  "day-meals-edit": "Meals edited",
}

const SLOT_LABELS: Record<string, string> = { BREAKFAST: "Box1", LUNCH: "Box2", DINNER: "Box3" }
const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

// "18/10/2026 (in 6 days)" / "(today)" / "(ended 3 days ago)", counting whole calendar days (UTC dates).
function planEndLabel(iso: string): string {
  const day = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const days = Math.round((day(new Date(iso)) - day(new Date())) / 86_400_000)
  const when = days === 0 ? "today" : days > 0 ? `in ${days} day${days === 1 ? "" : "s"}` : `ended ${-days} day${days === -1 ? "" : "s"} ago`
  return `${new Date(iso).toLocaleDateString("en-GB", { timeZone: "UTC" })} (${when})`
}

const planLabel = (p: PlanSummary) =>
  `${p.planDuration}-day ${p.tier.charAt(0)}${p.tier.slice(1).toLowerCase()}, ${p.mealsPerDay} meal${p.mealsPerDay === 1 ? "" : "s"}/day`

function renewalTiming(days: number): string {
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} before the previous plan ended`
  if (days === 0) return "on the last day of the previous plan"
  const late = -days
  return `${late} day${late === 1 ? "" : "s"} after the previous plan ended`
}

function mondayOf(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day))
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function ordersInWeek(orders: OrderRow[], weekStart: Date): OrderRow[] {
  const weekEnd = addDays(weekStart, 6)
  return orders
    .filter((o) => {
      const d = new Date(o.deliveryDate)
      return d >= weekStart && d <= weekEnd
    })
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
}

function WeekMenuCard({ title, weekStart, orders }: { title: string; weekStart: Date; orders: OrderRow[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-[12px] overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-[16px] font-bold text-gray-900">{title}</h3>
        <span className="text-xs text-gray-500">
          {weekStart.toLocaleDateString("en-GB")} – {addDays(weekStart, 6).toLocaleDateString("en-GB")}
        </span>
      </div>
      {orders.length === 0 ? (
        <p className="px-6 py-6 text-sm text-gray-400">No delivery scheduled this week.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {orders.map((o) => (
            <li key={o.id} className="px-6 py-3 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {WEEKDAY_LABELS[new Date(o.deliveryDate).getUTCDay()]} · {new Date(o.deliveryDate).toLocaleDateString("en-GB")}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {o.items.length === 0
                    ? "No items assigned"
                    : o.items.map((i) => `${SLOT_LABELS[i.slot] ?? i.slot}: ${i.menuItem.name}`).join(" · ")}
                </p>
              </div>
              <span
                className={`px-2.5 py-0.5 h-fit rounded-full text-xs font-semibold border shrink-0 ${
                  o.menuChosenAt ? "bg-[#F0F7F3] text-[#2E6B3E] border-[#cfe6d7]" : "bg-gray-100 text-gray-600 border-gray-200"
                }`}
              >
                {o.menuChosenAt ? "Chosen" : "Not chosen"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type RefundMode = "full" | "percentage" | "prorated" | "custom"

function RefundModal({
  payment,
  subscription,
  onClose,
  onSubmit,
}: {
  payment: Payment
  subscription: Subscription | undefined
  onClose: () => void
  onSubmit: (mode: RefundMode, value?: number) => Promise<void>
}) {
  const [mode, setMode] = useState<RefundMode>("full")
  const [percentage, setPercentage] = useState("50")
  const [customAmount, setCustomAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const paid = Number(payment.amount)

  // Preview only, mirroring server/src/routes/admin/customers.ts's calculation — the backend
  // is the source of truth for the amount actually refunded (exact-pence math there, not this
  // plain floating-point preview).
  let remainingDays: number | null = null
  let proratedAmount = 0
  if (subscription) {
    const start = new Date(subscription.startDate)
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const daysUsed = Math.max(0, Math.min(subscription.planDuration, Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1))
    remainingDays = subscription.planDuration - daysUsed
    proratedAmount = (paid * remainingDays) / subscription.planDuration
  }

  const previewAmount = Math.min(
    paid,
    mode === "full"
      ? paid
      : mode === "percentage"
        ? (paid * (Number(percentage) || 0)) / 100
        : mode === "prorated"
          ? proratedAmount
          : Number(customAmount) || 0
  )

  async function handleSubmit() {
    setError("")
    const value = mode === "percentage" ? Number(percentage) : mode === "custom" ? Number(customAmount) : undefined
    if (mode === "percentage" && (!value || value <= 0 || value > 100)) return setError("Enter a percentage between 1 and 100.")
    if (mode === "custom" && (!value || value <= 0)) return setError("Enter an amount greater than £0.")
    if (mode === "prorated" && !subscription) return setError("No subscription found for this payment.")
    setSubmitting(true)
    try {
      await onSubmit(mode, value)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not process this refund.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-[16px] w-[440px] shadow-xl flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-[18px] font-bold">Refund Payment</h3>
          <button onClick={onClose} className="cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500">
            Paid <span className="font-semibold text-gray-900">{formatGBP(paid)}</span> on{" "}
            {new Date(payment.createdAt).toLocaleDateString("en-GB")}
          </p>

          <div className="space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="radio" name="refund-mode" checked={mode === "full"} onChange={() => setMode("full")} />
              <span className="text-sm text-gray-900">Full refund</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="radio" name="refund-mode" checked={mode === "percentage"} onChange={() => setMode("percentage")} />
              <span className="text-sm text-gray-900">Percentage of amount paid</span>
            </label>
            <label className={`flex items-center gap-2.5 ${subscription ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}>
              <input
                type="radio"
                name="refund-mode"
                checked={mode === "prorated"}
                onChange={() => setMode("prorated")}
                disabled={!subscription}
              />
              <span className="text-sm text-gray-900">Prorated by unused plan days</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="radio" name="refund-mode" checked={mode === "custom"} onChange={() => setMode("custom")} />
              <span className="text-sm text-gray-900">Custom amount</span>
            </label>
          </div>

          {mode === "percentage" ? (
            <input
              type="number"
              min={1}
              max={100}
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-lg px-3"
              placeholder="Percentage (1-100)"
            />
          ) : null}
          {mode === "custom" ? (
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full h-10 border border-gray-200 rounded-lg px-3"
              placeholder="Amount in £"
            />
          ) : null}
          {mode === "prorated" && subscription ? (
            <p className="text-xs text-gray-500">
              {remainingDays} of {subscription.planDuration} days unused.
            </p>
          ) : null}
          {mode === "prorated" && !subscription ? (
            <p className="text-xs text-status-red">No subscription linked to this payment — prorated refund isn't available.</p>
          ) : null}

          <div className="rounded-lg bg-gray-50 p-3 flex justify-between items-center">
            <span className="text-sm text-gray-600">Refund amount</span>
            <span className="text-lg font-bold text-gray-900">{formatGBP(previewAmount)}</span>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-status-red">
              {error}
            </p>
          ) : null}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-status-red text-white rounded-lg font-semibold text-sm cursor-pointer disabled:opacity-60"
          >
            {submitting ? "Refunding..." : `Refund ${formatGBP(previewAmount)}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [error, setError] = useState("")
  const [pauseDate, setPauseDate] = useState("")
  const [refundingPayment, setRefundingPayment] = useState<Payment | null>(null)
  const [editing, setEditing] = useState(false)
  const [editingDeliveryOf, setEditingDeliveryOf] = useState<Subscription | null>(null)
  const [editingMealsOf, setEditingMealsOf] = useState<Subscription | null>(null)
  const [cancellingOf, setCancellingOf] = useState<Subscription | null>(null)
  const [notice, setNotice] = useState("")

  const customerQuery = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api.get<CustomerDetail>(`/customers/${id}`),
  })
  const customer = customerQuery.data

  const activityQuery = useQuery({
    queryKey: ["customer", id, "activity"],
    queryFn: () => api.get<ActivityEntry[]>(`/customers/${id}/activity`),
  })
  const auditLogQuery = useQuery({
    queryKey: ["customer", id, "audit-log"],
    queryFn: () => api.get<AuditLogEntry[]>(`/customers/${id}/audit-log`),
  })

  function invalidate() {
    // Prefix match — also invalidates ["customer", id, "audit-log"]
    return queryClient.invalidateQueries({ queryKey: ["customer", id] })
  }

  async function pauseOverride(subscriptionId: string) {
    if (!pauseDate) return setError("Pick a date to pause first.")
    setError("")
    try {
      await api.post(`/customers/${id}/pause-override`, { subscriptionId, date: pauseDate })
      setPauseDate("")
      await invalidate()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not pause that date.")
    }
  }

  async function submitRefund(paymentId: string, mode: RefundMode, value?: number) {
    await api.post(`/customers/${id}/refund`, { paymentId, mode, value })
    setRefundingPayment(null)
    await invalidate()
  }

  async function handleSubscriptionEdited(message: string) {
    setEditingDeliveryOf(null)
    setEditingMealsOf(null)
    setNotice(message)
    await invalidate()
  }

  async function handleEdited(result: EditResult) {
    setEditing(false)
    setNotice(
      result.changed.length === 0
        ? "No changes were needed."
        : result.emailChanged
          ? "Details saved. The email changed, so this customer will log in again with a code sent to the new address."
          : "Details saved."
    )
    await invalidate()
  }

  async function reactivate() {
    await api.post(`/customers/${id}/reactivate`)
    await invalidate()
  }

  if (customerQuery.isError) {
    return (
      <div className="flex-1 flex flex-col h-screen overflow-hidden ml-[260px]">
        <Header title="Customer" />
        <div className="flex-1 flex items-center justify-center">
          <QueryError onRetry={() => customerQuery.refetch()} />
        </div>
      </div>
    )
  }

  if (customerQuery.isLoading || !customer) {
    return (
      <div className="flex-1 flex flex-col h-screen overflow-hidden ml-[260px]">
        <Header title="Customer" />
        <div className="flex-1 flex items-center justify-center">
          <span className="material-symbols-outlined text-gray-400 animate-spin text-3xl">progress_activity</span>
        </div>
      </div>
    )
  }

  const style = ACCOUNT_STATUS_STYLES[customer.accountStatus]
  const activeSub = customer.subscriptions.find((s) => s.status === "ACTIVE" || s.status === "PENDING_PAYMENT")

  const allOrders = customer.subscriptions.flatMap((s) => s.orders)
  const orderHistory = [...allOrders].sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate))
  const thisWeekStart = mondayOf(new Date())
  const nextWeekStart = addDays(thisWeekStart, 7)
  // A cancelled plan has nothing left to cook, so its days stay out of the weekly menu cards (they remain in Order History).
  const liveOrders = customer.subscriptions.filter((s) => s.status !== "CANCELLED").flatMap((s) => s.orders)
  const thisWeekOrders = ordersInWeek(liveOrders, thisWeekStart)
  const nextWeekOrders = ordersInWeek(liveOrders, nextWeekStart)

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden ml-[260px]">
      <Header title={customer.fullName} />
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <Link to="/customers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to customers
        </Link>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-[20px] font-bold text-gray-900">{customer.fullName}</h2>
            <p className="text-sm text-gray-500">{customer.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.className}`}>{style.label}</span>
            {customer.planStatus === "CANCELLED" ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-red-50 text-red-700 border-red-100">Plan cancelled</span>
            ) : null}
            {customer.accountStatus !== "DELETED" ? (
              <button
                onClick={() => {
                  setNotice("")
                  setEditing(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#2E6B3E] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span> Edit details
              </button>
            ) : null}
            {customer.accountStatus !== "ACTIVE" ? (
              <button
                onClick={reactivate}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span> Reactivate
              </button>
            ) : null}
          </div>
        </div>

        {notice ? (
          <div role="status" className="flex items-center justify-between gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            <span>{notice}</span>
            <button onClick={() => setNotice("")} aria-label="Dismiss" className="cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="bg-white p-5 border border-gray-200 rounded-[12px]">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Age</p>
            <p className="text-gray-900 font-semibold">{ageFromDateOfBirth(customer.dateOfBirth) ?? "—"}</p>
          </div>
          <div className="bg-white p-5 border border-gray-200 rounded-[12px]">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone</p>
            <p className="text-gray-900 font-semibold">{customer.phone ? formatPhone(customer.phone) : "—"}</p>
          </div>
          <div className="bg-white p-5 border border-gray-200 rounded-[12px]">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Postcode</p>
            <p className="text-gray-900 font-semibold">{customer.addressPostcode ?? customer.postcode ?? "—"}</p>
          </div>
          <div className="bg-white p-5 border border-gray-200 rounded-[12px]">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Address</p>
            <p className="text-gray-900 font-semibold truncate" title={customer.address ?? undefined}>
              {customer.address ?? "—"}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-[12px] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-gray-900">Profile Details</h3>
            {customer.accountStatus !== "DELETED" ? (
              <button
                onClick={() => {
                  setNotice("")
                  setEditing(true)
                }}
                className="text-sm font-semibold text-primary hover:underline cursor-pointer"
              >
                Edit
              </button>
            ) : null}
          </div>
          <dl className="grid gap-x-6 gap-y-5 p-6 sm:grid-cols-3 text-sm">
            {[
              [
                customer.planStatus === "CANCELLED" ? "Plan" : "Plan ends",
                customer.planStatus === "CANCELLED"
                  ? `Cancelled${customer.planCancelledAt ? ` on ${new Date(customer.planCancelledAt).toLocaleDateString("en-GB")}` : ""}`
                  : customer.planEndDate
                    ? planEndLabel(customer.planEndDate)
                    : "No plan",
              ],
              ["Date of birth", customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString("en-GB") : "—"],
              ["Gender", customer.gender ?? "—"],
              ["Height", customer.heightCm ? `${customer.heightCm} cm` : "—"],
              ["Weight", customer.weightKg ? `${customer.weightKg} kg` : "—"],
              ["Style", customer.goal ? GOAL_LABELS[customer.goal] ?? customer.goal : "—"],
              ["Food types", customer.dietTypes.length ? customer.dietTypes.map((d) => DIET_LABELS[d] ?? d).join(", ") : "—"],
              ["Allergens", customer.allergens.length ? customer.allergens.join(", ") : "None"],
              ["Marketing emails", customer.marketingOptIn ? "Agreed" : "Not agreed"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</dt>
                <dd className="text-gray-900 font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="bg-white border border-gray-200 rounded-[12px] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-[16px] font-bold text-gray-900">Renewal History</h3>
          </div>
          {customer.renewals.length === 0 ? (
            <p className="px-6 py-6 text-sm text-gray-400">No renewals yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {customer.renewals.map((r) => (
                <li key={r.subscriptionId} className="px-6 py-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900">
                      {new Date(r.renewedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {formatGBP(r.amountPaid)}
                      {r.discountAmount > 0 ? <span className="ml-2 text-xs font-medium text-green-700">promo −{formatGBP(r.discountAmount)}</span> : null}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-600">
                    {planLabel(r.previous)} <span className="text-gray-400">→</span> {planLabel(r.current)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Renewed by {customer.fullName} (customer, from their dashboard) · {renewalTiming(r.daysBeforePreviousEnd)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-[12px] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-[16px] font-bold text-gray-900">Subscriptions</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Started</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Ends</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Length</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Meals/day</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Paused Days</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customer.subscriptions.map((s) => {
                const subStyle = SUBSCRIPTION_STATUS_STYLES[s.status]
                return (
                  <tr key={s.id}>
                    <td className="py-3 px-6 text-gray-900">{new Date(s.startDate).toLocaleDateString("en-GB")}</td>
                    <td className="py-3 px-6 text-gray-900">{new Date(s.endDate).toLocaleDateString("en-GB")}</td>
                    <td className="py-3 px-6 text-gray-600">{s.planDuration} days</td>
                    <td className="py-3 px-6 text-gray-600">{s.mealsPerDay}</td>
                    <td className="py-3 px-6">
                      {subStyle ? (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${subStyle.className}`}>
                          {subStyle.label}
                        </span>
                      ) : (
                        s.status
                      )}
                      {s.status === "CANCELLED" && (s.cancelledAt || s.cancellationReason) ? (
                        <p className="mt-1 max-w-[260px] text-xs text-gray-500">
                          {s.cancelledAt ? `Cancelled ${new Date(s.cancelledAt).toLocaleDateString("en-GB")}. ` : ""}
                          {s.cancellationReason ? `Reason: ${s.cancellationReason}` : "No reason given."}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 px-6 text-gray-600">{s.pausedDates.length}</td>
                    <td className="py-3 px-6 text-right">
                      {s.status === "ACTIVE" ? (
                        <button
                          onClick={() => {
                            setNotice("")
                            setEditingDeliveryOf(s)
                          }}
                          className="inline-flex items-center gap-1 mr-4 text-xs font-semibold text-primary hover:underline cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">local_shipping</span> Delivery
                        </button>
                      ) : null}
                      {s.status === "ACTIVE" ? (
                        <button
                          onClick={() => {
                            setNotice("")
                            setEditingMealsOf(s)
                          }}
                          className="inline-flex items-center gap-1 mr-4 text-xs font-semibold text-primary hover:underline cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">restaurant</span> Meals
                        </button>
                      ) : null}
                      {s.status === "ACTIVE" ? (
                        <button
                          onClick={() => {
                            setNotice("")
                            setCancellingOf(s)
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-status-red hover:text-red-700 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">cancel</span> Cancel
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
              {customer.subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-gray-400">
                    No subscriptions yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <WeekMenuCard title="This Week's Menu" weekStart={thisWeekStart} orders={thisWeekOrders} />
          <WeekMenuCard title="Next Week's Menu" weekStart={nextWeekStart} orders={nextWeekOrders} />
        </div>

        <div className="bg-white border border-gray-200 rounded-[12px] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-[16px] font-bold text-gray-900">Order History</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Delivery Date</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Menu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orderHistory.map((o) => {
                const orderStyle = ORDER_STATUS_STYLES[o.status]
                return (
                  <tr key={o.id}>
                    <td className="py-3 px-6 text-gray-900">{new Date(o.deliveryDate).toLocaleDateString("en-GB")}</td>
                    <td className="py-3 px-6 text-gray-600">
                      {o.items.length === 0 ? "—" : o.items.map((i) => `${SLOT_LABELS[i.slot] ?? i.slot}: ${i.menuItem.name}`).join(", ")}
                    </td>
                    <td className="py-3 px-6">
                      {orderStyle ? (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${orderStyle.className}`}>
                          {orderStyle.label}
                        </span>
                      ) : (
                        o.status
                      )}
                    </td>
                    <td className="py-3 px-6 text-gray-600">{o.menuChosenAt ? "Chosen" : "Not chosen"}</td>
                  </tr>
                )
              })}
              {orderHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-gray-400">
                    No orders yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Hidden for now — not needed yet. Remove the `false &&` to bring back. */}
        {false && activeSub ? (
          <div className="bg-white border border-gray-200 rounded-[12px] p-6">
            <h3 className="text-[16px] font-bold text-gray-900 mb-1">Support: Pause Override</h3>
            <p className="text-sm text-gray-500 mb-4">Bypasses the customer's 4-pauses-per-month cap for support cases.</p>
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5" htmlFor="pause-date">
                  Date
                </label>
                <input
                  id="pause-date"
                  type="date"
                  className="h-10 border border-gray-200 rounded-lg px-3 text-sm"
                  value={pauseDate}
                  onChange={(e) => setPauseDate(e.target.value)}
                />
              </div>
              <button
                onClick={() => activeSub && pauseOverride(activeSub.id)}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer h-10"
              >
                <span className="material-symbols-outlined text-[16px]">pause_circle</span> Pause That Day
              </button>
            </div>
            {error ? <p role="alert" className="mt-2 text-sm text-status-red">{error}</p> : null}
          </div>
        ) : null}

        <div className="bg-white border border-gray-200 rounded-[12px] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-[16px] font-bold text-gray-900">Payments</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(customer?.payments ?? []).map((p) => (
                <tr key={p.id}>
                  <td className="py-3 px-6 text-gray-900">{new Date(p.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="py-3 px-6 text-gray-900 font-semibold">{formatGBP(Number(p.amount))}</td>
                  <td className="py-3 px-6 text-gray-600">
                    {p.status}
                    {p.refundedAmount ? (
                      <span className="block text-xs text-gray-400">Refunded {formatGBP(Number(p.refundedAmount))}</span>
                    ) : null}
                  </td>
                  <td className="py-3 px-6 text-right">
                    {p.status === "succeeded" && !p.refundedAmount ? (
                      <button
                        onClick={() => setRefundingPayment(p)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-status-red hover:text-red-700 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">undo</span> Refund
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {(customer?.payments ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-gray-400">
                    No payments yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-gray-200 rounded-[12px] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-[16px] font-bold text-gray-900">Customer activity</h3>
            <p className="text-xs text-gray-500 mt-0.5">Changes the customer made themselves, newest first.</p>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">When</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">What</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(activityQuery.data ?? []).map((entry) => (
                <tr key={entry.id}>
                  <td className="py-3 px-6 text-gray-900 whitespace-nowrap">{new Date(entry.createdAt).toLocaleString("en-GB")}</td>
                  <td className="py-3 px-6 text-gray-900 font-semibold">{ACTIVITY_LABELS[entry.action] ?? entry.action}</td>
                  <td className="py-3 px-6 text-gray-600">{entry.detail ?? "—"}</td>
                </tr>
              ))}
              {(activityQuery.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-sm text-gray-400">
                    Nothing yet. Changes the customer makes from now on will show here.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Hidden for now — not needed yet. Set to true to bring back. */}
        {false && (
          <div className="bg-white border border-gray-200 rounded-[12px] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-[16px] font-bold text-gray-900">Support Action History</h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Admin</th>
                  <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(auditLogQuery.data ?? []).map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-3 px-6 text-gray-900">{new Date(entry.createdAt).toLocaleString("en-GB")}</td>
                    <td className="py-3 px-6 text-gray-900 font-semibold">{AUDIT_ACTION_LABELS[entry.action] ?? entry.action}</td>
                    <td className="py-3 px-6 text-gray-600">{entry.admin.name}</td>
                    <td className="py-3 px-6 text-gray-600">{entry.detail ?? "—"}</td>
                  </tr>
                ))}
                {(auditLogQuery.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-gray-400">
                      No support actions recorded yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {cancellingOf ? (
        <CancelModal
          customerId={customer.id}
          subscription={cancellingOf}
          onClose={() => setCancellingOf(null)}
          onSaved={async (message) => {
            setCancellingOf(null)
            await handleSubscriptionEdited(message)
          }}
        />
      ) : null}
      {editingDeliveryOf ? (
        <DeliveryModal customerId={customer.id} subscription={editingDeliveryOf} onClose={() => setEditingDeliveryOf(null)} onSaved={handleSubscriptionEdited} />
      ) : null}
      {editingMealsOf ? (
        <MealsModal
          customerId={customer.id}
          customerAllergens={customer.allergens}
          subscription={editingMealsOf}
          onClose={() => setEditingMealsOf(null)}
          onSaved={handleSubscriptionEdited}
        />
      ) : null}
      {editing ? <EditCustomerModal customer={customer} onClose={() => setEditing(false)} onSaved={handleEdited} /> : null}
      {refundingPayment ? (
        <RefundModal
          payment={refundingPayment}
          subscription={customer.subscriptions.find((s) => s.id === refundingPayment.subscriptionId)}
          onClose={() => setRefundingPayment(null)}
          onSubmit={(mode, value) => submitRefund(refundingPayment.id, mode, value)}
        />
      ) : null}
    </div>
  )
}

export default CustomerDetail
