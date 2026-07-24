import { useEffect, useState, useCallback } from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft, RotateCcw, Undo2, PauseCircle } from "lucide-react"
import { api, ApiError } from "@/lib/api"
import { formatGBP } from "@/lib/currency"
import { ACCOUNT_STATUS_STYLES } from "@/lib/status-styles"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Subscription {
  id: string
  planDuration: number
  startDate: string
  mealsPerDay: number
  status: string
  pausedDates: string[]
  createdAt: string
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
  age: number | null
  postcode: string | null
  address: string | null
  accountStatus: string
  subscriptions: Subscription[]
  payments: Payment[]
}

function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [error, setError] = useState("")
  const [pauseDate, setPauseDate] = useState("")

  const load = useCallback(() => {
    if (!id) return
    api.get<CustomerDetail>(`/customers/${id}`).then(setCustomer)
  }, [id])

  useEffect(load, [load])

  async function pauseOverride(subscriptionId: string) {
    if (!pauseDate) return setError("Pick a date to pause first.")
    setError("")
    try {
      await api.post(`/customers/${id}/pause-override`, { subscriptionId, date: pauseDate })
      setPauseDate("")
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not pause that date.")
    }
  }

  async function refund(paymentId: string) {
    if (!confirm("Mark this payment as refunded?")) return
    await api.post(`/customers/${id}/refund`, { paymentId })
    load()
  }

  async function reactivate() {
    await api.post(`/customers/${id}/reactivate`)
    load()
  }

  if (!customer) return <p className="text-sm text-ink-muted">Loading…</p>

  const style = ACCOUNT_STATUS_STYLES[customer.accountStatus]
  const activeSub = customer.subscriptions.find((s) => s.status === "ACTIVE" || s.status === "PENDING_PAYMENT")

  return (
    <div className="space-y-6">
      <Link to="/customers" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to customers
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl text-ink">{customer.fullName}</h1>
          <p className="text-sm text-ink-muted">{customer.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={style.className}>{style.label}</Badge>
          {customer.accountStatus !== "ACTIVE" && (
            <Button size="sm" variant="outline" onClick={reactivate}>
              <RotateCcw className="h-3.5 w-3.5" /> Reactivate
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent><p className="text-xs text-ink-muted">Age</p><p className="text-ink font-medium">{customer.age ?? "—"}</p></CardContent></Card>
        <Card><CardContent><p className="text-xs text-ink-muted">Postcode</p><p className="text-ink font-medium">{customer.postcode ?? "—"}</p></CardContent></Card>
        <Card><CardContent><p className="text-xs text-ink-muted">Address</p><p className="text-ink font-medium truncate">{customer.address ?? "—"}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Subscriptions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-muted">
                <th className="px-5 py-2.5 font-medium">Started</th>
                <th className="px-5 py-2.5 font-medium">Length</th>
                <th className="px-5 py-2.5 font-medium">Meals/day</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">Paused days</th>
              </tr>
            </thead>
            <tbody>
              {customer.subscriptions.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-2.5 text-ink">{new Date(s.startDate).toLocaleDateString("en-GB")}</td>
                  <td className="px-5 py-2.5 text-ink-muted">{s.planDuration} days</td>
                  <td className="px-5 py-2.5 text-ink-muted">{s.mealsPerDay}</td>
                  <td className="px-5 py-2.5 text-ink-muted">{s.status}</td>
                  <td className="px-5 py-2.5 text-ink-muted">{s.pausedDates.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {activeSub && (
        <Card>
          <CardHeader><CardTitle>Support: pause override</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-ink-muted mb-3">Bypasses the customer's 4-pauses-per-month cap for support cases.</p>
            <div className="flex items-end gap-3">
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1.5" htmlFor="pause-date">Date</label>
                <Input id="pause-date" type="date" value={pauseDate} onChange={(e) => setPauseDate(e.target.value)} />
              </div>
              <Button size="sm" onClick={() => pauseOverride(activeSub.id)}>
                <PauseCircle className="h-3.5 w-3.5" /> Pause that day
              </Button>
            </div>
            {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-muted">
                <th className="px-5 py-2.5 font-medium">Date</th>
                <th className="px-5 py-2.5 font-medium">Amount</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {customer.payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-2.5 text-ink">{new Date(p.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="px-5 py-2.5 text-ink font-medium">{formatGBP(Number(p.amount))}</td>
                  <td className="px-5 py-2.5 text-ink-muted">{p.status}</td>
                  <td className="px-5 py-2.5 text-right">
                    {p.status === "succeeded" && (
                      <button onClick={() => refund(p.id)} className="inline-flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 cursor-pointer">
                        <Undo2 className="h-3.5 w-3.5" /> Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

export default CustomerDetail
