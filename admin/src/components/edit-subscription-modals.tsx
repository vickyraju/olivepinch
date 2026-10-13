import { useState } from "react"
import { useQuery, useQueries } from "@tanstack/react-query"
import { api, ApiError } from "@/lib/api"
import { BOXES_BY_MEALS_PER_DAY, BOX_LABELS } from "@/lib/customer-labels"

export interface EditableOrder {
  id: string
  deliveryDate: string
  status: string
  items: { slot: string; menuItem: { id: string; name: string } }[]
}

export interface EditableSubscription {
  id: string
  planDuration: number
  mealsPerDay: number
  deliverySlot: string
  deliveryTimeSlot: string
  orders: EditableOrder[]
}

interface MenuItem {
  id: string
  name: string
  slot: string
  allergenTags: string[]
  dietTags: string[]
}

interface TimeSlot {
  id: string
  label: string
  active: boolean
}

const labelClass = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1"
const inputClass = "w-full h-10 border border-gray-200 rounded-lg px-3 text-sm outline-none focus:border-primary bg-white"

function Shell({ title, children, footer, onClose, wide }: { title: string; children: React.ReactNode; footer: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`bg-white rounded-[16px] w-full ${wide ? "max-w-[760px]" : "max-w-[480px]"} max-h-[92vh] shadow-xl flex flex-col overflow-hidden`}>
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-[18px] font-bold">{title}</h3>
          <button onClick={onClose} className="cursor-pointer" aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">{children}</div>
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">{footer}</div>
      </div>
    </div>
  )
}

function ErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null
  return (
    <div role="alert" className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-status-red space-y-1">
      {errors.map((e) => (
        <p key={e}>{e}</p>
      ))}
    </div>
  )
}

const reasons = (err: unknown, fallback: string) => (err instanceof ApiError ? (err.problems?.length ? err.problems : [err.message]) : [fallback])

// ---------------------------------------------------------------------------------------------
// Delivery: time window only (every plan is delivered daily).
// ---------------------------------------------------------------------------------------------
export function DeliveryModal({
  customerId,
  subscription,
  onClose,
  onSaved,
}: {
  customerId: string
  subscription: EditableSubscription
  onClose: () => void
  onSaved: (message: string) => void | Promise<void>
}) {
  const [windowLabel, setWindowLabel] = useState(subscription.deliveryTimeSlot)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const windowsQuery = useQuery({ queryKey: ["delivery-time-slots"], queryFn: () => api.get<TimeSlot[]>("/delivery-time-slots") })
  // Active windows, plus the plan's current one even if it has since been retired, so nothing is lost.
  const windows = [...new Set([...(windowsQuery.data ?? []).filter((w) => w.active).map((w) => w.label), subscription.deliveryTimeSlot])]
  const unchanged = windowLabel === subscription.deliveryTimeSlot

  async function save() {
    setSaving(true)
    setErrors([])
    try {
      const body: Record<string, string> = {}
      if (windowLabel !== subscription.deliveryTimeSlot) body.deliveryTimeSlot = windowLabel
      await api.patch(`/customers/${customerId}/subscriptions/${subscription.id}`, body)
      await onSaved("Delivery settings saved.")
    } catch (err) {
      setErrors(reasons(err, "Couldn't save these changes. Try again."))
      setSaving(false)
    }
  }

  return (
    <Shell
      title="Edit delivery"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold cursor-pointer">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving || unchanged} className="px-6 py-2 bg-[#2E6B3E] text-white rounded-lg font-semibold text-sm cursor-pointer disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-500">
        {subscription.planDuration}-day plan. Length, tier and meals per day can't be changed here, because they decide what the customer paid.
      </p>
      <div>
        <label className={labelClass}>Delivery time window</label>
        <select className={inputClass} value={windowLabel} onChange={(e) => setWindowLabel(e.target.value)}>
          {windows.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-gray-400">The customer isn't emailed about this change. Let them know if it affects them.</p>
      <ErrorList errors={errors} />
    </Shell>
  )
}

// ---------------------------------------------------------------------------------------------
// Meals on specific upcoming days.
// ---------------------------------------------------------------------------------------------
// Monday of the week a YYYY-MM-DD date falls in (the key menu weeks are stored under).
function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

const londonToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" })

export function MealsModal({
  customerId,
  customerAllergens,
  subscription,
  onClose,
  onSaved,
}: {
  customerId: string
  customerAllergens: string[]
  subscription: EditableSubscription
  onClose: () => void
  onSaved: (message: string) => void | Promise<void>
}) {
  const boxes = BOXES_BY_MEALS_PER_DAY[subscription.mealsPerDay] ?? []
  const today = londonToday()
  // Only days the kitchen hasn't started on: after today, and still scheduled or paused.
  const days = subscription.orders
    .filter((o) => o.deliveryDate.slice(0, 10) > today && (o.status === "SCHEDULED" || o.status === "PAUSED"))
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
    .map((o) => ({ date: o.deliveryDate.slice(0, 10), status: o.status, current: boxes.map((box) => o.items.find((i) => i.slot === box)?.menuItem.id ?? "") }))

  const [picks, setPicks] = useState<Record<string, string[]>>(() => Object.fromEntries(days.map((d) => [d.date, d.current])))
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const menuQuery = useQuery({ queryKey: ["menu-items"], queryFn: () => api.get<MenuItem[]>("/menu-items") })
  // What each day's published menu offers, so those meals can be listed first. A week with no menu (404) just has none.
  const weekStarts = [...new Set(days.map((d) => mondayOf(d.date)))]
  const weekQueries = useQueries({
    queries: weekStarts.map((w) => ({
      queryKey: ["menu-week", w],
      queryFn: () => api.get<{ published: boolean; items: { id: string; date: string }[] }>(`/menu-weeks/${w}`).catch(() => null),
    })),
  })
  const onMenu = new Set(weekQueries.flatMap((q) => (q.data?.published ? q.data.items.map((i) => `${i.date}|${i.id}`) : [])))
  const avoided = new Set(customerAllergens.map((a) => a.trim().toLowerCase()))
  const clashes = (item: MenuItem) => item.allergenTags.filter((a) => avoided.has(a.trim().toLowerCase()))

  const changedDays = days.filter((d) => picks[d.date]?.some((id, i) => id !== d.current[i]))
  // A day is saved whole, so a changed day needs a meal in every box.
  const incomplete = changedDays.filter((d) => picks[d.date]!.some((id) => !id))

  async function save() {
    setSaving(true)
    setErrors([])
    try {
      const result = await api.patch<{ updatedDays: string[]; warnings: string[] }>(`/customers/${customerId}/subscriptions/${subscription.id}/meals`, {
        dayItems: changedDays.map((d) => ({ date: d.date, items: picks[d.date]! })),
      })
      await onSaved(
        `Meals updated for ${result.updatedDays.length} day${result.updatedDays.length === 1 ? "" : "s"}.${result.warnings.length ? " Note: " + result.warnings.join(" ") : ""}`
      )
    } catch (err) {
      setErrors(reasons(err, "Couldn't save these meals. Try again."))
      setSaving(false)
    }
  }

  return (
    <Shell
      wide
      title="Edit meals"
      onClose={onClose}
      footer={
        <>
          <span className="mr-auto text-xs text-gray-400">{incomplete.length > 0 ? "Choose a meal for every box on a changed day." : changedDays.length === 0 ? "No changes yet." : `${changedDays.length} day${changedDays.length === 1 ? "" : "s"} changed.`}</span>
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold cursor-pointer">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving || changedDays.length === 0 || incomplete.length > 0} className="px-6 py-2 bg-[#2E6B3E] text-white rounded-lg font-semibold text-sm cursor-pointer disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-500">
        Choose any meal for the upcoming days. This isn't limited to the published menu or the Friday cutoff. Meals containing{" "}
        {customerAllergens.length ? <strong className="text-gray-800">{customerAllergens.join(", ")}</strong> : "an allergen the customer avoids"} are disabled. Today and past
        deliveries can't be changed.
      </p>

      {days.length === 0 ? (
        <p className="text-sm text-gray-400">This plan has no upcoming days that can still be changed.</p>
      ) : (
        <div className="space-y-3">
          {days.map((d) => {
            const dirty = changedDays.some((c) => c.date === d.date)
            return (
              <div key={d.date} className={`rounded-lg border p-4 ${dirty ? "border-[#2E6B3E] bg-[#F0F7F3]" : "border-gray-200"}`}>
                <p className="text-sm font-bold text-gray-900 mb-3">
                  {new Date(`${d.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                  {d.status === "PAUSED" ? <span className="ml-2 text-xs font-semibold text-gray-500">(paused)</span> : null}
                  {d.current.some((id) => !id) ? <span className="ml-2 text-xs font-semibold text-amber-600">Not chosen yet</span> : null}
                </p>
                <div className={`grid gap-3 ${boxes.length === 2 ? "sm:grid-cols-2" : boxes.length >= 3 ? "sm:grid-cols-3" : ""}`}>
                  {boxes.map((box, i) => (
                    <div key={box}>
                      <label className={labelClass}>{BOX_LABELS[box] ?? box}</label>
                      <select
                        className={inputClass}
                        value={picks[d.date]?.[i] ?? ""}
                        onChange={(e) => setPicks((p) => ({ ...p, [d.date]: (p[d.date] ?? []).map((id, j) => (j === i ? e.target.value : id)) }))}
                      >
                        {!picks[d.date]?.[i] ? <option value="">Choose a meal…</option> : null}
                        {(() => {
                          const options = (menuQuery.data ?? [])
                            .filter((m) => m.slot === box || m.id === d.current[i])
                            .sort((a, b) => a.name.localeCompare(b.name))
                          const render = (m: MenuItem) => {
                            const bad = clashes(m)
                            return (
                              <option key={m.id} value={m.id} disabled={bad.length > 0 && m.id !== picks[d.date]?.[i]}>
                                {m.name}
                                {bad.length ? ` — contains ${bad.join(", ")}` : ""}
                              </option>
                            )
                          }
                          const today = options.filter((m) => onMenu.has(`${d.date}|${m.id}`))
                          if (today.length === 0) return options.map(render)
                          return (
                            <>
                              <optgroup label="On this day's menu">{today.map(render)}</optgroup>
                              <optgroup label="Other meals">{options.filter((m) => !today.includes(m)).map(render)}</optgroup>
                            </>
                          )
                        })()}
                        {menuQuery.isLoading ? <option value={picks[d.date]?.[i] ?? ""}>Loading…</option> : null}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <ErrorList errors={errors} />
    </Shell>
  )
}
