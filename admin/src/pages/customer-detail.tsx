import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Header } from "@/components/header"
import { api, ApiError } from "@/lib/api"
import { formatGBP } from "@/lib/currency"
import { ACCOUNT_STATUS_STYLES, ORDER_STATUS_STYLES } from "@/lib/status-styles"

interface OrderItemRow {
  slot: string
  menuItem: { name: string }
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
  status: string
  pausedDates: string[]
  createdAt: string
  orders: OrderRow[]
}

interface Payment {
  id: string
  amount: string
  status: string
  createdAt: string
}

interface CustomerDetail {
  id: string
  fullName: string
  email: string
  phone: string | null
  age: number | null
  postcode: string | null
  address: string | null
  accountStatus: string
  subscriptions: Subscription[]
  payments: Payment[]
}

interface AuditLogEntry {
  id: string
  action: string
  detail: string | null
  createdAt: string
  admin: { name: string; email: string }
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  "pause-override": "Pause override",
  refund: "Refund",
  reactivate: "Reactivate",
}

const SLOT_LABELS: Record<string, string> = { BREAKFAST: "Breakfast", LUNCH: "Lunch", DINNER: "Dinner" }
const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

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
                {o.menuChosenAt ? "Chosen" : "Default"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [error, setError] = useState("")
  const [pauseDate, setPauseDate] = useState("")

  const customerQuery = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api.get<CustomerDetail>(`/customers/${id}`),
  })
  const customer = customerQuery.data

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

  async function refund(paymentId: string) {
    if (!confirm("Mark this payment as refunded?")) return
    await api.post(`/customers/${id}/refund`, { paymentId })
    await invalidate()
  }

  async function reactivate() {
    await api.post(`/customers/${id}/reactivate`)
    await invalidate()
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
  const thisWeekOrders = ordersInWeek(allOrders, thisWeekStart)
  const nextWeekOrders = ordersInWeek(allOrders, nextWeekStart)

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

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="bg-white p-5 border border-gray-200 rounded-[12px]">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Age</p>
            <p className="text-gray-900 font-semibold">{customer.age ?? "—"}</p>
          </div>
          <div className="bg-white p-5 border border-gray-200 rounded-[12px]">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone</p>
            <p className="text-gray-900 font-semibold">{customer.phone ?? "—"}</p>
          </div>
          <div className="bg-white p-5 border border-gray-200 rounded-[12px]">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Postcode</p>
            <p className="text-gray-900 font-semibold">{customer.postcode ?? "—"}</p>
          </div>
          <div className="bg-white p-5 border border-gray-200 rounded-[12px]">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Address</p>
            <p className="text-gray-900 font-semibold truncate" title={customer.address ?? undefined}>
              {customer.address ?? "—"}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-[12px] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-[16px] font-bold text-gray-900">Subscriptions</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Started</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Length</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Meals/day</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Paused Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customer.subscriptions.map((s) => (
                <tr key={s.id}>
                  <td className="py-3 px-6 text-gray-900">{new Date(s.startDate).toLocaleDateString("en-GB")}</td>
                  <td className="py-3 px-6 text-gray-600">{s.planDuration} days</td>
                  <td className="py-3 px-6 text-gray-600">{s.mealsPerDay}</td>
                  <td className="py-3 px-6 text-gray-600">{s.status}</td>
                  <td className="py-3 px-6 text-gray-600">{s.pausedDates.length}</td>
                </tr>
              ))}
              {customer.subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
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
                    <td className="py-3 px-6 text-gray-600">{o.menuChosenAt ? "Chosen" : "Default"}</td>
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

        {activeSub ? (
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
                onClick={() => pauseOverride(activeSub.id)}
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
              {customer.payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 px-6 text-gray-900">{new Date(p.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="py-3 px-6 text-gray-900 font-semibold">{formatGBP(Number(p.amount))}</td>
                  <td className="py-3 px-6 text-gray-600">{p.status}</td>
                  <td className="py-3 px-6 text-right">
                    {p.status === "succeeded" ? (
                      <button
                        onClick={() => refund(p.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-status-red hover:text-red-700 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">undo</span> Refund
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {customer.payments.length === 0 ? (
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
      </div>
    </div>
  )
}

export default CustomerDetail
