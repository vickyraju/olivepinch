import { useEffect, useState, useCallback } from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft, RotateCcw, Undo2, PauseCircle, PlayCircle, MapPin, Settings2, HeartPulse, History } from "lucide-react"
import { api, ApiError } from "@/lib/api"
import { formatGBP } from "@/lib/currency"
import { ACCOUNT_STATUS_STYLES } from "@/lib/status-styles"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar } from "@/components/ui/avatar"

// Admin can act on a customer's behalf for address, delivery days, and preferences — but never
// triggers a renewal/payment (PCI boundary), edits health log entries, deletes an account, or
// downloads a GDPR export. Those stay customer-only by design.

const GOALS = ["WEIGHT_LOSS", "WEIGHT_GAIN", "WEIGHT_MAINTENANCE", "MUSCLE_BUILDING"]
const DIETS = ["MEAT", "FISH", "VEGAN", "VEGETARIAN", "EGG"]

interface OrderRow {
  id: string
  deliveryDate: string
  status: string
  items: { menuItem: { name: string }; slot: string }[]
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

interface HealthLog {
  id: string
  heightCm: number
  weightKg: number
  chestCm: number
  bicepCm: number
  abdomenCm: number
  waistCm: number
  loggedAt: string
}

interface AuditLogEntry {
  id: string
  action: string
  detail: string | null
  createdAt: string
  admin: { name: string; email: string }
}

interface CustomerDetail {
  id: string
  fullName: string
  email: string
  dateOfBirth: string | null
  gender: string | null
  heightCm: number | null
  weightKg: number | null
  goal: string | null
  dietTypes: string[]
  allergens: string[]
  postcode: string | null
  addressDoorNumber: string | null
  addressBuildingName: string | null
  addressStreet: string | null
  addressArea: string | null
  addressPostcode: string | null
  address: string | null
  accountStatus: string
  subscriptions: Subscription[]
  payments: Payment[]
  healthLogs: HealthLog[]
}

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth)
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const monthDiff = now.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--
  return age
}

const emptyAddress = { addressDoorNumber: "", addressBuildingName: "", addressStreet: "", addressArea: "", addressPostcode: "" }

function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [error, setError] = useState("")

  const [editingAddress, setEditingAddress] = useState(false)
  const [addressForm, setAddressForm] = useState(emptyAddress)
  const [addressError, setAddressError] = useState("")
  const [savingAddress, setSavingAddress] = useState(false)

  const [editingPrefs, setEditingPrefs] = useState(false)
  const [prefsForm, setPrefsForm] = useState({ goal: "", dietTypes: [] as string[], allergens: "" })
  const [savingPrefs, setSavingPrefs] = useState(false)

  const [dayActionInFlight, setDayActionInFlight] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!id) return
    api.get<CustomerDetail>(`/customers/${id}`).then((c) => {
      setCustomer(c)
      setAddressForm({
        addressDoorNumber: c.addressDoorNumber ?? "",
        addressBuildingName: c.addressBuildingName ?? "",
        addressStreet: c.addressStreet ?? "",
        addressArea: c.addressArea ?? "",
        addressPostcode: c.addressPostcode ?? "",
      })
      setPrefsForm({ goal: c.goal ?? "", dietTypes: c.dietTypes, allergens: c.allergens.join(", ") })
    })
    api.get<AuditLogEntry[]>(`/customers/${id}/audit-log`).then(setAuditLog)
  }, [id])

  useEffect(load, [load])

  async function pauseDay(subscriptionId: string, date: string) {
    setDayActionInFlight(date)
    try {
      await api.post(`/customers/${id}/pause-override`, { subscriptionId, date })
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not pause that day.")
    } finally {
      setDayActionInFlight(null)
    }
  }

  async function resumeDay(subscriptionId: string, date: string) {
    setDayActionInFlight(date)
    try {
      await api.post(`/customers/${id}/resume-override`, { subscriptionId, date })
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resume that day.")
    } finally {
      setDayActionInFlight(null)
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

  async function saveAddress() {
    setSavingAddress(true)
    setAddressError("")
    try {
      await api.patch(`/customers/${id}/address`, {
        ...addressForm,
        addressBuildingName: addressForm.addressBuildingName || undefined,
      })
      setEditingAddress(false)
      load()
    } catch (err) {
      setAddressError(err instanceof ApiError ? err.message : "Could not save that address.")
    } finally {
      setSavingAddress(false)
    }
  }

  function toggleDiet(diet: string) {
    setPrefsForm((f) => ({ ...f, dietTypes: f.dietTypes.includes(diet) ? f.dietTypes.filter((d) => d !== diet) : [...f.dietTypes, diet] }))
  }

  async function savePrefs() {
    setSavingPrefs(true)
    try {
      await api.patch(`/customers/${id}/preferences`, {
        goal: prefsForm.goal,
        dietTypes: prefsForm.dietTypes,
        allergens: prefsForm.allergens ? prefsForm.allergens.split(",").map((s) => s.trim()).filter(Boolean) : [],
      })
      setEditingPrefs(false)
      load()
    } finally {
      setSavingPrefs(false)
    }
  }

  if (!customer) return <p className="text-sm text-ink-muted">Loading…</p>

  const style = ACCOUNT_STATUS_STYLES[customer.accountStatus]
  const activeSub = customer.subscriptions.find((s) => s.status === "ACTIVE" || s.status === "PENDING_PAYMENT")
  const canEditPrefs = prefsForm.goal !== "" && prefsForm.dietTypes.length > 0

  return (
    <div className="space-y-6">
      <Link to="/customers" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to customers
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={customer.fullName} className="h-11 w-11 text-sm" />
          <div>
            <h1 className="text-2xl text-ink">{customer.fullName}</h1>
            <p className="text-sm text-ink-muted">{customer.email}</p>
          </div>
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

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div><dt className="text-xs text-ink-muted">Age</dt><dd className="text-ink font-medium">{customer.dateOfBirth ? calculateAge(customer.dateOfBirth) : "—"}</dd></div>
            <div><dt className="text-xs text-ink-muted">Gender</dt><dd className="text-ink font-medium">{customer.gender ?? "—"}</dd></div>
            <div><dt className="text-xs text-ink-muted">Height</dt><dd className="text-ink font-medium">{customer.heightCm ? `${customer.heightCm} cm` : "—"}</dd></div>
            <div><dt className="text-xs text-ink-muted">Weight</dt><dd className="text-ink font-medium">{customer.weightKg ? `${customer.weightKg} kg` : "—"}</dd></div>
            <div><dt className="text-xs text-ink-muted">Goal</dt><dd className="text-ink font-medium">{customer.goal ?? "—"}</dd></div>
            <div><dt className="text-xs text-ink-muted">Diet</dt><dd className="text-ink font-medium">{customer.dietTypes.join(", ") || "—"}</dd></div>
            <div><dt className="text-xs text-ink-muted">Allergens</dt><dd className="text-ink font-medium">{customer.allergens.join(", ") || "None"}</dd></div>
            <div><dt className="text-xs text-ink-muted">Postcode</dt><dd className="text-ink font-medium">{customer.postcode ?? "—"}</dd></div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4 text-olive-600" /> Delivery address</CardTitle>
          {!editingAddress && <Button size="sm" variant="outline" onClick={() => setEditingAddress(true)}>Edit</Button>}
        </CardHeader>
        <CardContent>
          {!editingAddress ? (
            <p className="text-ink">{customer.address ?? "No address on file"}</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="doorNumber">Door number</Label>
                  <Input id="doorNumber" value={addressForm.addressDoorNumber} onChange={(e) => setAddressForm((a) => ({ ...a, addressDoorNumber: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="buildingName">Building name (optional)</Label>
                  <Input id="buildingName" value={addressForm.addressBuildingName} onChange={(e) => setAddressForm((a) => ({ ...a, addressBuildingName: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label htmlFor="street">Street</Label>
                <Input id="street" value={addressForm.addressStreet} onChange={(e) => setAddressForm((a) => ({ ...a, addressStreet: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="area">Area</Label>
                  <Input id="area" value={addressForm.addressArea} onChange={(e) => setAddressForm((a) => ({ ...a, addressArea: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input id="postcode" value={addressForm.addressPostcode} onChange={(e) => setAddressForm((a) => ({ ...a, addressPostcode: e.target.value }))} aria-invalid={!!addressError} />
                </div>
              </div>
              {addressError && <p role="alert" className="text-sm text-destructive">{addressError}</p>}
              <div className="flex gap-2">
                <Button size="sm" disabled={savingAddress} onClick={saveAddress}>{savingAddress ? "Saving…" : "Save"}</Button>
                <Button size="sm" variant="ghost" disabled={savingAddress} onClick={() => { setEditingAddress(false); setAddressError("") }}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-olive-600" /> Preferences</CardTitle>
          {!editingPrefs && <Button size="sm" variant="outline" onClick={() => setEditingPrefs(true)}>Edit</Button>}
        </CardHeader>
        <CardContent>
          {!editingPrefs ? (
            <p className="text-sm text-ink-muted">Edit this customer's goal, diet types, and allergens on their behalf.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="goal">Goal</Label>
                <select
                  id="goal"
                  value={prefsForm.goal}
                  onChange={(e) => setPrefsForm((f) => ({ ...f, goal: e.target.value }))}
                  className="flex h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-ink"
                >
                  <option value="" disabled>Select a goal</option>
                  {GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <Label>Diet types</Label>
                <div className="flex gap-2 flex-wrap">
                  {DIETS.map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => toggleDiet(d)}
                      className={`px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer ${
                        prefsForm.dietTypes.includes(d) ? "bg-olive-600 text-white border-olive-600" : "bg-surface border-border text-ink"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="allergens">Allergens (comma-separated)</Label>
                <Input id="allergens" value={prefsForm.allergens} onChange={(e) => setPrefsForm((f) => ({ ...f, allergens: e.target.value }))} placeholder="Gluten, Dairy" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={savingPrefs || !canEditPrefs} onClick={savePrefs}>{savingPrefs ? "Saving…" : "Save"}</Button>
                <Button size="sm" variant="ghost" disabled={savingPrefs} onClick={() => setEditingPrefs(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Subscriptions</CardTitle></CardHeader>
        <CardContent className="p-0">
          {customer.subscriptions.length === 0 ? (
            <p className="p-5 text-sm text-ink-muted">No subscriptions yet.</p>
          ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-muted bg-canvas/60">
                <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Started</th>
                <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Length</th>
                <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Meals/day</th>
                <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Status</th>
                <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Paused days</th>
              </tr>
            </thead>
            <tbody>
              {customer.subscriptions.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-canvas/60">
                  <td className="px-5 py-2.5 text-ink">{new Date(s.startDate).toLocaleDateString("en-GB")}</td>
                  <td className="px-5 py-2.5 text-ink-muted">{s.planDuration} days</td>
                  <td className="px-5 py-2.5 text-ink-muted">{s.mealsPerDay}</td>
                  <td className="px-5 py-2.5 text-ink-muted">{s.status}</td>
                  <td className="px-5 py-2.5 text-ink-muted">{s.pausedDates.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </CardContent>
      </Card>

      {activeSub && (
        <Card>
          <CardHeader><CardTitle>Delivery days</CardTitle></CardHeader>
          <CardContent className="p-0">
            <p className="px-5 pt-3 pb-1 text-xs text-ink-muted">Pause or resume specific days on this customer's behalf. Not subject to their monthly pause cap.</p>
            {activeSub.orders.length === 0 ? (
              <p className="p-5 text-sm text-ink-muted">No delivery days scheduled yet.</p>
            ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-ink-muted bg-canvas/60">
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Date</th>
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Items</th>
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Status</th>
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider" />
                </tr>
              </thead>
              <tbody>
                {activeSub.orders.map((o) => {
                  const date = o.deliveryDate.slice(0, 10)
                  const isPaused = o.status === "PAUSED"
                  return (
                    <tr key={o.id} className="border-b border-border last:border-0 hover:bg-canvas/60">
                      <td className="px-5 py-2.5 text-ink">{new Date(o.deliveryDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</td>
                      <td className="px-5 py-2.5 text-ink-muted">{o.items.map((i) => `${i.slot}: ${i.menuItem.name}`).join(" · ")}</td>
                      <td className="px-5 py-2.5 text-ink-muted">{o.status}</td>
                      <td className="px-5 py-2.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={dayActionInFlight === date}
                          onClick={() => (isPaused ? resumeDay(activeSub.id, date) : pauseDay(activeSub.id, date))}
                        >
                          {isPaused ? <><PlayCircle className="h-3.5 w-3.5" /> Resume</> : <><PauseCircle className="h-3.5 w-3.5" /> Pause</>}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
        <CardContent className="p-0">
          {customer.payments.length === 0 ? (
            <p className="p-5 text-sm text-ink-muted">No payments yet.</p>
          ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-ink-muted bg-canvas/60">
                <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Date</th>
                <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Amount</th>
                <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Status</th>
                <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider" />
              </tr>
            </thead>
            <tbody>
              {customer.payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-canvas/60">
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
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-olive-600" /> Health logs</CardTitle></CardHeader>
        <CardContent className="p-0">
          {customer.healthLogs.length === 0 ? (
            <p className="p-5 text-sm text-ink-muted">No health logs yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-ink-muted bg-canvas/60">
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Date</th>
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Weight</th>
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Chest</th>
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Bicep</th>
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Abdomen</th>
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Waist</th>
                </tr>
              </thead>
              <tbody>
                {customer.healthLogs.map((h) => (
                  <tr key={h.id} className="border-b border-border last:border-0 hover:bg-canvas/60">
                    <td className="px-5 py-2.5 text-ink">{new Date(h.loggedAt).toLocaleDateString("en-GB")}</td>
                    <td className="px-5 py-2.5 text-ink-muted">{h.weightKg} kg</td>
                    <td className="px-5 py-2.5 text-ink-muted">{h.chestCm} cm</td>
                    <td className="px-5 py-2.5 text-ink-muted">{h.bicepCm} cm</td>
                    <td className="px-5 py-2.5 text-ink-muted">{h.abdomenCm} cm</td>
                    <td className="px-5 py-2.5 text-ink-muted">{h.waistCm} cm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-4 w-4 text-olive-600" /> Recent admin actions</CardTitle></CardHeader>
        <CardContent className="p-0">
          {auditLog.length === 0 ? (
            <p className="p-5 text-sm text-ink-muted">No support actions logged for this customer yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {auditLog.map((entry) => (
                <li key={entry.id} className="px-5 py-2.5 text-sm flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-ink">
                    <span className="font-medium">{entry.action}</span>
                    {entry.detail && <span className="text-ink-muted"> — {entry.detail}</span>}
                  </span>
                  <span className="text-xs text-ink-muted">{entry.admin.name} · {new Date(entry.createdAt).toLocaleString("en-GB")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default CustomerDetail
