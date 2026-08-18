import { useEffect, useState, useCallback, useMemo } from "react"
import { Download } from "lucide-react"
import { api, downloadFile } from "@/lib/api"
import { ORDER_STATUS_STYLES } from "@/lib/status-styles"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"

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
  const [statusFilter, setStatusFilter] = useState("")

  const [exportFrom, setExportFrom] = useState(todayIso())
  const [exportTo, setExportTo] = useState(todayIso())
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    api.get<OrderRow[]>(`/orders?date=${date}`).then(setOrders).finally(() => setLoading(false))
  }, [date])

  useEffect(load, [load])

  const visibleOrders = useMemo(
    () => (statusFilter ? orders.filter((o) => o.status === statusFilter) : orders),
    [orders, statusFilter]
  )

  async function updateStatus(orderId: string, status: string) {
    await api.patch(`/orders/${orderId}/status`, { status })
    load()
  }

  async function handleExport() {
    setExporting(true)
    setExportError("")
    try {
      const filename = exportFrom === exportTo ? `kitchen-export-${exportFrom}.xlsx` : `kitchen-export-${exportFrom}-to-${exportTo}.xlsx`
      await downloadFile(`/orders/kitchen-export?from=${exportFrom}&to=${exportTo}`, filename)
    } catch {
      setExportError("Could not generate the export — try again.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Order Board"
        description="Kitchen prep and delivery happen off-platform — update each order's status here as it moves."
        actions={
          <>
            <div>
              <Label htmlFor="date">Delivery date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 rounded-sm border border-border bg-surface px-3 text-sm text-ink cursor-pointer"
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{ORDER_STATUS_STYLES[s].label}</option>)}
              </select>
            </div>
          </>
        }
      />

      <Card>
        <CardContent>
          <h2 className="text-sm font-semibold text-ink mb-3">Kitchen export</h2>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <Label htmlFor="export-from">From</Label>
              <Input id="export-from" type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="export-to">To</Label>
              <Input id="export-to" type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} />
            </div>
            <Button size="sm" disabled={exporting} onClick={handleExport}>
              <Download className="h-3.5 w-3.5" /> {exporting ? "Preparing…" : "Download kitchen export (.xlsx)"}
            </Button>
          </div>
          {exportError && <p role="alert" className="mt-2 text-sm text-destructive">{exportError}</p>}
          <p className="mt-2 text-xs text-ink-muted">Leave From and To the same for a single day's export.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-5 text-sm text-ink-muted">Loading…</p>
          ) : visibleOrders.length === 0 ? (
            <p className="p-5 text-sm text-ink-muted">No orders scheduled for this date.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-ink-muted bg-canvas/60">
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Customer</th>
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Address</th>
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Items</th>
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Status</th>
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Update</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => {
                  const style = ORDER_STATUS_STYLES[order.status]
                  return (
                    <tr key={order.id} className="border-b border-border last:border-0 hover:bg-canvas/60">
                      <td className="px-5 py-2.5 text-ink font-medium">{order.subscription.customer.fullName}</td>
                      <td className="px-5 py-2.5 text-ink-muted">{order.subscription.customer.address ?? order.subscription.customer.postcode ?? "—"}</td>
                      <td className="px-5 py-2.5 text-ink-muted">{order.items.map((i) => i.menuItem.name).join(", ")}</td>
                      <td className="px-5 py-2.5"><Badge className={style.className}>{style.label}</Badge></td>
                      <td className="px-5 py-2.5">
                        <select
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                          className="h-8 rounded-sm border border-border bg-surface px-2 text-xs text-ink cursor-pointer"
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
