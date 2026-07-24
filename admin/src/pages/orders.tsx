import { useEffect, useState, useCallback } from "react"
import { api } from "@/lib/api"
import { ORDER_STATUS_STYLES } from "@/lib/status-styles"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface OrderRow {
  id: string
  status: string
  items: { menuItem: { name: string }; slot: string }[]
  subscription: { customer: { fullName: string; address: string | null; postcode: string | null } }
}

const STATUS_OPTIONS = ["SCHEDULED", "OUT_FOR_DELIVERY", "DELIVERED", "ATTEMPTED", "PAUSED"]

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function Orders() {
  const [date, setDate] = useState(todayIso())
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    api.get<OrderRow[]>(`/orders?date=${date}`).then(setOrders).finally(() => setLoading(false))
  }, [date])

  useEffect(load, [load])

  async function updateStatus(orderId: string, status: string) {
    await api.patch(`/orders/${orderId}/status`, { status })
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl text-ink">Order Board</h1>
        <div>
          <Label htmlFor="date">Delivery date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-ink-muted -mt-4">
        Kitchen prep and delivery happen off-platform — update each order's status here as it moves.
      </p>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-5 text-sm text-ink-muted">Loading…</p>
          ) : orders.length === 0 ? (
            <p className="p-5 text-sm text-ink-muted">No orders scheduled for this date.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-ink-muted">
                  <th className="px-5 py-2.5 font-medium">Customer</th>
                  <th className="px-5 py-2.5 font-medium">Address</th>
                  <th className="px-5 py-2.5 font-medium">Items</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Update</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const style = ORDER_STATUS_STYLES[order.status]
                  return (
                    <tr key={order.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-2.5 text-ink font-medium">{order.subscription.customer.fullName}</td>
                      <td className="px-5 py-2.5 text-ink-muted">{order.subscription.customer.address ?? order.subscription.customer.postcode ?? "—"}</td>
                      <td className="px-5 py-2.5 text-ink-muted">{order.items.map((i) => i.menuItem.name).join(", ")}</td>
                      <td className="px-5 py-2.5"><Badge className={style.className}>{style.label}</Badge></td>
                      <td className="px-5 py-2.5">
                        <select
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                          className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-ink cursor-pointer"
                        >
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{ORDER_STATUS_STYLES[s].label}</option>)}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Orders
