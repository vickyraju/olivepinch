import { useEffect, useMemo, useState } from "react"
import { Check, X, Pencil, Eye, EyeOff, Plus } from "lucide-react"
import { api } from "@/lib/api"
import { formatGBP } from "@/lib/currency"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { cn } from "@/lib/utils"

interface Plan {
  id: string
  planDuration: number
  goal: string
  price: string
  active: boolean
}

const DURATIONS = [7, 14, 28] as const
const GOALS = ["WEIGHT_LOSS", "WEIGHT_GAIN", "WEIGHT_MAINTENANCE", "MUSCLE_BUILDING"] as const
const GOAL_LABELS: Record<string, string> = {
  WEIGHT_LOSS: "Weight Loss",
  WEIGHT_GAIN: "Weight Gain",
  WEIGHT_MAINTENANCE: "Weight Maintenance",
  MUSCLE_BUILDING: "Muscle Building",
}

function Plans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draftPrice, setDraftPrice] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function load() {
    setLoading(true)
    api.get<Plan[]>("/plans").then(setPlans).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const grid = useMemo(() => {
    const map = new Map<string, Plan>()
    for (const p of plans) map.set(`${p.goal}:${p.planDuration}`, p)
    return map
  }, [plans])

  function startEdit(goal: string, duration: number) {
    const existing = grid.get(`${goal}:${duration}`)
    setEditingKey(`${goal}:${duration}`)
    setDraftPrice(existing ? existing.price : "")
    setError("")
  }

  function cancelEdit() {
    setEditingKey(null)
    setDraftPrice("")
    setError("")
  }

  async function saveEdit(goal: string, duration: number) {
    const price = Number(draftPrice)
    if (!draftPrice || Number.isNaN(price) || price <= 0) {
      setError("Enter a price greater than 0.")
      return
    }
    setSaving(true)
    setError("")
    const existing = grid.get(`${goal}:${duration}`)
    try {
      if (existing) {
        await api.patch(`/plans/${existing.id}`, { price })
      } else {
        await api.post("/plans", { goal, planDuration: duration, price, active: true })
      }
      cancelEdit()
      load()
    } catch {
      setError("Could not save this price — try again.")
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(plan: Plan) {
    await api.patch(`/plans/${plan.id}`, { active: !plan.active })
    load()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing Plans"
        description="The flat rate a customer pays, set per goal and plan length — not a sum of individual meals. Click a price to edit it."
      />

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <p className="p-5 text-sm text-ink-muted">Loading…</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-canvas/60 text-left text-ink-muted">
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Goal</th>
                  {DURATIONS.map((d) => (
                    <th key={d} className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-center">
                      {d} days
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GOALS.map((goal) => (
                  <tr key={goal} className="border-b border-border last:border-0 hover:bg-canvas/40">
                    <td className="px-5 py-4 text-ink font-medium whitespace-nowrap">{GOAL_LABELS[goal]}</td>
                    {DURATIONS.map((duration) => {
                      const key = `${goal}:${duration}`
                      const plan = grid.get(key)
                      const isEditing = editingKey === key
                      return (
                        <td key={duration} className="px-3 py-3 text-center align-middle">
                          {isEditing ? (
                            <div className="inline-flex flex-col items-center gap-1.5">
                              <div className="inline-flex items-center gap-1">
                                <span className="text-ink-muted text-sm">£</span>
                                <input
                                  autoFocus
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={draftPrice}
                                  onChange={(e) => setDraftPrice(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEdit(goal, duration)
                                    if (e.key === "Escape") cancelEdit()
                                  }}
                                  className="w-20 h-8 rounded-sm border border-olive-400 bg-surface px-2 text-sm text-ink text-center focus:outline-none focus:ring-2 focus:ring-olive-500/30"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => saveEdit(goal, duration)}
                                  disabled={saving}
                                  className="h-6 w-6 inline-flex items-center justify-center rounded-sm text-olive-600 hover:bg-olive-50 cursor-pointer disabled:opacity-40"
                                  aria-label="Save price"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="h-6 w-6 inline-flex items-center justify-center rounded-sm text-ink-muted hover:bg-canvas cursor-pointer"
                                  aria-label="Cancel edit"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : plan ? (
                            <div
                              className={cn(
                                "group inline-flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5",
                                !plan.active && "opacity-50"
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => startEdit(goal, duration)}
                                className="inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <span className="font-display text-base font-bold text-ink">{formatGBP(Number(plan.price))}</span>
                                <Pencil className="h-3 w-3 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                              <span className="text-[11px] text-ink-muted">{formatGBP(Number(plan.price) / duration)}/day</span>
                              <button
                                type="button"
                                onClick={() => toggleActive(plan)}
                                aria-label={plan.active ? "Deactivate plan" : "Reactivate plan"}
                                className={cn(
                                  "mt-1 inline-flex items-center gap-1 text-[10px] font-medium cursor-pointer transition-opacity",
                                  plan.active
                                    ? "text-ink-muted opacity-0 group-hover:opacity-100 hover:text-coral-500"
                                    : "text-olive-600 hover:text-olive-700"
                                )}
                              >
                                {plan.active ? (
                                  <><EyeOff className="h-3 w-3" /> Hide</>
                                ) : (
                                  <><Eye className="h-3 w-3" /> Reactivate</>
                                )}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEdit(goal, duration)}
                              className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:border-olive-400 hover:text-olive-700 cursor-pointer"
                            >
                              <Plus className="h-3 w-3" /> Set price
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <p className="text-xs text-ink-muted">
        Hiding a plan removes it from checkout without losing its price or affecting customers already subscribed to it.
      </p>
    </div>
  )
}

export default Plans
