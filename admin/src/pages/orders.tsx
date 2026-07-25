import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Header } from "@/components/header"
import { TableSkeleton } from "@/components/skeletons/table-skeleton"
import { api } from "@/lib/api"
import { ORDER_STATUS_STYLES } from "@/lib/status-styles"

interface OrderRow {
  id: string
  status: string
  items: { menuItem: { name: string }; slot: string }[]
  subscription: { customer: { fullName: string; address: string | null; postcode: string | null } }
}

const STATUS_OPTIONS = ["SCHEDULED", "OUT_FOR_DELIVERY", "DELIVERED", "ATTEMPTED", "PAUSED"]
const statusFilters = [{ key: "All", label: "All" }, ...STATUS_OPTIONS.map((s) => ({ key: s, label: ORDER_STATUS_STYLES[s].label }))]

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function Orders() {
  const queryClient = useQueryClient()
  const [date, setDate] = useState(todayIso())
  const [filter, setFilter] = useState<string>("All")
  const [search, setSearch] = useState("")

  const ordersQuery = useQuery({
    queryKey: ["orders", date],
    queryFn: () => api.get<OrderRow[]>(`/orders?date=${date}`),
  })

  const filteredOrders = useMemo(() => {
    let rows = ordersQuery.data ?? []
    if (filter !== "All") rows = rows.filter((o) => o.status === filter)
    const q = search.trim().toLowerCase()
    if (q) rows = rows.filter((o) => o.subscription.customer.fullName.toLowerCase().includes(q))
    return rows
  }, [ordersQuery.data, filter, search])

  async function updateStatus(orderId: string, status: string) {
    await api.patch(`/orders/${orderId}/status`, { status })
    await queryClient.invalidateQueries({ queryKey: ["orders", date] })
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden ml-[260px]">
      <Header title="Order Board" />
      <div className="flex-1 overflow-y-auto p-8">
        <p className="text-sm text-gray-500 mb-6">Kitchen prep and delivery happen off-platform — update each order's status here as it moves.</p>

        <div className="bg-white rounded-[12px] border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
            <div className="relative w-full flex-1 max-w-[280px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none"
                placeholder="Search customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider" htmlFor="delivery-date">
                Delivery Date
              </label>
              <input
                id="delivery-date"
                type="date"
                className="h-9 border border-gray-300 rounded-lg px-3 text-sm bg-white"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="px-6 py-4 border-b border-gray-200 bg-white overflow-x-auto flex items-center gap-2 no-scrollbar">
            {statusFilters.map((s) => (
              <button
                key={s.key}
                onClick={() => setFilter(s.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors shrink-0 cursor-pointer ${
                  filter === s.key ? "bg-[#2E6B3E] text-white" : "text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {ordersQuery.isLoading ? <TableSkeleton columns={5} /> : null}
                {!ordersQuery.isLoading &&
                  filteredOrders.map((order) => {
                    const style = ORDER_STATUS_STYLES[order.status]
                    return (
                      <tr key={order.id} className="hover:bg-gray-50/50">
                        <td className="py-4 px-6 font-semibold text-gray-900">{order.subscription.customer.fullName}</td>
                        <td className="py-4 px-6 text-gray-600">
                          {order.subscription.customer.address ?? order.subscription.customer.postcode ?? "—"}
                        </td>
                        <td className="py-4 px-6 text-gray-600">{order.items.map((i) => i.menuItem.name).join(", ")}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.className}`}>{style.label}</span>
                        </td>
                        <td className="py-4 px-6">
                          <select
                            value={order.status}
                            onChange={(e) => updateStatus(order.id, e.target.value)}
                            className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-700 cursor-pointer"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {ORDER_STATUS_STYLES[s].label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                {!ordersQuery.isLoading && filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-gray-400">
                      No orders match this filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Orders
