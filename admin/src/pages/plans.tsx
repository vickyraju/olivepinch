import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Header } from "@/components/header"
import { TableSkeleton } from "@/components/skeletons/table-skeleton"
import { api } from "@/lib/api"
import { formatGBP } from "@/lib/currency"

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
  const queryClient = useQueryClient()
  const plansQuery = useQuery({ queryKey: ["plans"], queryFn: () => api.get<Plan[]>("/plans") })
  const plans = plansQuery.data ?? []

  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draftPrice, setDraftPrice] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

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
      await queryClient.invalidateQueries({ queryKey: ["plans"] })
    } catch {
      setError("Could not save this price — try again.")
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(plan: Plan) {
    await api.patch(`/plans/${plan.id}`, { active: !plan.active })
    await queryClient.invalidateQueries({ queryKey: ["plans"] })
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden ml-[260px]">
      <Header title="Pricing Plans" />
      <div className="flex-1 overflow-y-auto p-8">
        <p className="mb-6 text-sm text-gray-500">
          The flat rate a customer pays, set per goal and plan length — not a sum of individual meals. Click a
          price to edit it.
        </p>

        <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Goal</th>
                {DURATIONS.map((d) => (
                  <th
                    key={d}
                    className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center"
                  >
                    {d} days
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {plansQuery.isLoading ? (
                <TableSkeleton columns={4} rows={4} />
              ) : (
                GOALS.map((goal) => (
                  <tr key={goal} className="hover:bg-gray-50/50">
                    <td className="py-4 px-6 font-semibold text-gray-900 whitespace-nowrap">{GOAL_LABELS[goal]}</td>
                    {DURATIONS.map((duration) => {
                      const key = `${goal}:${duration}`
                      const plan = grid.get(key)
                      const isEditing = editingKey === key
                      return (
                        <td key={duration} className="py-3 px-3 text-center align-middle">
                          {isEditing ? (
                            <div className="inline-flex flex-col items-center gap-1.5">
                              <div className="inline-flex items-center gap-1">
                                <span className="text-gray-400 text-sm">£</span>
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
                                  className="w-20 h-8 rounded-md border border-[#418A56] px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#418A56]/30"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => saveEdit(goal, duration)}
                                  disabled={saving}
                                  className="h-6 w-6 inline-flex items-center justify-center rounded-md text-[#2E6B3E] hover:bg-[#F0F7F3] cursor-pointer disabled:opacity-40"
                                  aria-label="Save price"
                                >
                                  <span className="material-symbols-outlined text-[16px]">check</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="h-6 w-6 inline-flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 cursor-pointer"
                                  aria-label="Cancel edit"
                                >
                                  <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                              </div>
                            </div>
                          ) : plan ? (
                            <div
                              className={`group inline-flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 ${
                                !plan.active ? "opacity-50" : ""
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => startEdit(goal, duration)}
                                className="inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <span className="font-bold text-[16px] text-gray-900">{formatGBP(Number(plan.price))}</span>
                                <span className="material-symbols-outlined text-[14px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                  edit
                                </span>
                              </button>
                              <span className="text-[11px] text-gray-500">{formatGBP(Number(plan.price) / duration)}/day</span>
                              <button
                                type="button"
                                onClick={() => toggleActive(plan)}
                                aria-label={plan.active ? "Deactivate plan" : "Reactivate plan"}
                                className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold cursor-pointer transition-opacity ${
                                  plan.active
                                    ? "text-gray-400 opacity-0 group-hover:opacity-100 hover:text-status-red"
                                    : "text-[#2E6B3E] hover:text-[#1f4d2b]"
                                }`}
                              >
                                <span className="material-symbols-outlined text-[12px]">
                                  {plan.active ? "visibility_off" : "visibility"}
                                </span>
                                {plan.active ? "Hide" : "Reactivate"}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEdit(goal, duration)}
                              className="inline-flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:border-[#418A56] hover:text-[#2E6B3E] cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px]">add</span> Set price
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-status-red">
            {error}
          </p>
        )}

        <p className="mt-4 text-xs text-gray-500">
          Hiding a plan removes it from checkout without losing its price or affecting customers already
          subscribed to it.
        </p>
      </div>
    </div>
  )
}

export default Plans
