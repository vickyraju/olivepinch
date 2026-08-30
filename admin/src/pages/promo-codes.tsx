import { useState } from "react"
import type { FormEvent } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Header } from "@/components/header"
import { TableSkeleton } from "@/components/skeletons/table-skeleton"
import { QueryError } from "@/components/query-error"
import { api } from "@/lib/api"
import { formatGBP } from "@/lib/currency"

interface PromoCode {
  id: string
  code: string
  discountType: "PERCENT" | "FLAT"
  discountValue: string
  minPlanDuration: number | null
  expiresAt: string | null
  maxRedemptions: number | null
  maxRedemptionsPerCustomer: number | null
  restrictToGoal: string | null
  restrictToTier: string | null
  firstSubscriptionOnly: boolean
  active: boolean
  _count: { redemptions: number }
}

const GOAL_LABELS: Record<string, string> = {
  WEIGHT_LOSS: "Weight Loss",
  WEIGHT_GAIN: "Weight Gain",
  WEIGHT_MAINTENANCE: "Weight Maintenance",
  MUSCLE_BUILDING: "Muscle Building",
}
const TIER_LABELS: Record<string, string> = { BASIC: "Basic", ADVANCED: "Advanced" }

const EMPTY_FORM = {
  code: "",
  discountType: "PERCENT" as "PERCENT" | "FLAT",
  discountValue: "",
  minPlanDuration: "",
  expiresAt: "",
  maxRedemptions: "",
  maxRedemptionsPerCustomer: "",
  restrictToGoal: "",
  restrictToTier: "",
  firstSubscriptionOnly: false,
}

function PromoCodes() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const promoQuery = useQuery({ queryKey: ["promo-codes"], queryFn: () => api.get<PromoCode[]>("/promo-codes") })

  function updateForm<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError("")
    const discountValue = Number(form.discountValue)
    if (!form.code.trim() || !discountValue || discountValue <= 0) {
      setError("Enter a code and a discount value greater than 0.")
      return
    }
    setSaving(true)
    try {
      await api.post("/promo-codes", {
        code: form.code.trim(),
        discountType: form.discountType,
        discountValue,
        minPlanDuration: form.minPlanDuration ? Number(form.minPlanDuration) : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
        maxRedemptionsPerCustomer: form.maxRedemptionsPerCustomer ? Number(form.maxRedemptionsPerCustomer) : undefined,
        restrictToGoal: form.restrictToGoal || undefined,
        restrictToTier: form.restrictToTier || undefined,
        firstSubscriptionOnly: form.firstSubscriptionOnly,
      })
      setForm(EMPTY_FORM)
      setShowModal(false)
      await queryClient.invalidateQueries({ queryKey: ["promo-codes"] })
    } catch {
      setError("Could not save this promo code — check the code is unique.")
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(promo: PromoCode) {
    await api.patch(`/promo-codes/${promo.id}`, { active: !promo.active })
    await queryClient.invalidateQueries({ queryKey: ["promo-codes"] })
  }

  function describeDiscount(promo: PromoCode) {
    return promo.discountType === "PERCENT" ? `${Number(promo.discountValue)}% off` : `${formatGBP(Number(promo.discountValue))} off`
  }

  function describeRestrictions(promo: PromoCode) {
    const parts: string[] = []
    if (promo.minPlanDuration) parts.push(`${promo.minPlanDuration}+ days`)
    if (promo.restrictToGoal) parts.push(GOAL_LABELS[promo.restrictToGoal] ?? promo.restrictToGoal)
    if (promo.restrictToTier) parts.push(TIER_LABELS[promo.restrictToTier] ?? promo.restrictToTier)
    if (promo.firstSubscriptionOnly) parts.push("First plan only")
    if (promo.expiresAt) parts.push(`Expires ${new Date(promo.expiresAt).toLocaleDateString("en-GB")}`)
    return parts.length ? parts.join(" · ") : "No restrictions"
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden ml-[260px]">
      <Header title="Promo Codes" />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-6 flex justify-between items-center">
          <p className="text-sm text-gray-500">Discount codes usable at signup and renewal.</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#2E6B3E] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span> New Promo Code
          </button>
        </div>

        <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Discount</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Restrictions</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Redemptions</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {promoQuery.isError ? (
                <tr>
                  <td colSpan={6}>
                    <QueryError onRetry={() => promoQuery.refetch()} />
                  </td>
                </tr>
              ) : promoQuery.isLoading ? (
                <TableSkeleton columns={6} rows={3} />
              ) : (
                (promoQuery.data ?? []).map((promo) => (
                  <tr key={promo.id} className="hover:bg-gray-50/50">
                    <td className="py-4 px-6 font-semibold text-gray-900">{promo.code}</td>
                    <td className="py-4 px-6">{describeDiscount(promo)}</td>
                    <td className="py-4 px-6 text-gray-500 text-[13px]">{describeRestrictions(promo)}</td>
                    <td className="py-4 px-6">
                      {promo._count.redemptions}
                      {promo.maxRedemptions ? ` / ${promo.maxRedemptions}` : ""}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          promo.active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {promo.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => toggleActive(promo)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        {promo.active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
              {!promoQuery.isLoading && !promoQuery.isError && (promoQuery.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                    No promo codes configured yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[16px] w-[480px] shadow-xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-[18px] font-bold">New Promo Code</h3>
              <button onClick={() => setShowModal(false)} className="cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Code</label>
                <input
                  className="w-full h-10 border border-gray-200 rounded-lg px-3"
                  placeholder="SUMMER20"
                  value={form.code}
                  onChange={(e) => updateForm("code", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Discount Type</label>
                  <select
                    className="w-full h-10 border border-gray-200 rounded-lg px-3"
                    value={form.discountType}
                    onChange={(e) => updateForm("discountType", e.target.value as "PERCENT" | "FLAT")}
                  >
                    <option value="PERCENT">Percent</option>
                    <option value="FLAT">Flat (£)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    {form.discountType === "PERCENT" ? "Percent off" : "Amount off (£)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full h-10 border border-gray-200 rounded-lg px-3"
                    value={form.discountValue}
                    onChange={(e) => updateForm("discountValue", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Min Plan Length</label>
                  <select
                    className="w-full h-10 border border-gray-200 rounded-lg px-3"
                    value={form.minPlanDuration}
                    onChange={(e) => updateForm("minPlanDuration", e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="28">28 days</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Expires</label>
                  <input
                    type="date"
                    className="w-full h-10 border border-gray-200 rounded-lg px-3"
                    value={form.expiresAt}
                    onChange={(e) => updateForm("expiresAt", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Redemption Cap</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full h-10 border border-gray-200 rounded-lg px-3"
                    placeholder="Unlimited"
                    value={form.maxRedemptions}
                    onChange={(e) => updateForm("maxRedemptions", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Per-Customer Cap</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full h-10 border border-gray-200 rounded-lg px-3"
                    placeholder="Unlimited"
                    value={form.maxRedemptionsPerCustomer}
                    onChange={(e) => updateForm("maxRedemptionsPerCustomer", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Goal</label>
                  <select
                    className="w-full h-10 border border-gray-200 rounded-lg px-3"
                    value={form.restrictToGoal}
                    onChange={(e) => updateForm("restrictToGoal", e.target.value)}
                  >
                    <option value="">Any goal</option>
                    {Object.entries(GOAL_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tier</label>
                  <select
                    className="w-full h-10 border border-gray-200 rounded-lg px-3"
                    value={form.restrictToTier}
                    onChange={(e) => updateForm("restrictToTier", e.target.value)}
                  >
                    <option value="">Any tier</option>
                    {Object.entries(TIER_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2.5 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.firstSubscriptionOnly}
                  onChange={(e) => updateForm("firstSubscriptionOnly", e.target.checked)}
                />
                First subscription only
              </label>
              {error ? <p role="alert" className="text-sm text-status-red">{error}</p> : null}
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-primary text-white rounded-lg font-semibold text-sm disabled:opacity-60 cursor-pointer">
                  {saving ? "Saving..." : "Save Promo Code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PromoCodes
