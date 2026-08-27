import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react"
import { useDashboard } from "@/lib/dashboard-context"
import { useAuth } from "@/lib/auth"
import { GOALS, DIET_TYPES, ALLERGENS, type Goal, type DietType } from "@/data/menu"
import { usePlans, priceFor, formatGBP } from "@/lib/pricing"
import { GOAL_TO_ENUM, TIER_TO_ENUM } from "@/lib/enum-map"
import { api, ApiError } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const DURATIONS: (7 | 14 | 28)[] = [7, 14, 28]
const MEALS_OPTIONS: (1 | 2 | 3)[] = [1, 2, 3]

// Mirrors REMINDER_OFFSET_DAYS in server/src/routes/internal.ts — the Renew section only
// becomes actionable once the renewal-reminder email would've gone out, not right after signup.
const REMINDER_OFFSET_DAYS: Record<number, number> = { 7: 2, 14: 4, 28: 7 }

function Subscription() {
  const { customer, endDate, renew, confirmRenewal } = useDashboard()
  const { customer: authCustomer } = useAuth()
  const sub = customer.subscription
  const [duration, setDuration] = useState<7 | 14 | 28>(sub.planDuration)
  const [mealsPerDay, setMealsPerDay] = useState<1 | 2 | 3>(sub.mealsPerDay)
  const [goal, setGoal] = useState<Goal>(sub.goal)
  const [dietTypes, setDietTypes] = useState<DietType[]>(sub.dietTypes)
  const [allergens, setAllergens] = useState<string[]>(sub.allergens)
  const [noAllergies, setNoAllergies] = useState(sub.allergens.length === 0)
  const [editingPreferences, setEditingPreferences] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const [error, setError] = useState("")
  const [searchParams, setSearchParams] = useSearchParams()

  const [promoInput, setPromoInput] = useState("")
  const [promoCode, setPromoCode] = useState<string | null>(null)
  const [promoDiscount, setPromoDiscount] = useState<number | null>(null)
  const [promoError, setPromoError] = useState("")
  const [applyingPromo, setApplyingPromo] = useState(false)

  const plans = usePlans()
  const isExpired = sub.status === "expired"
  const daysUntilEnd = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const showRenewal = isExpired || daysUntilEnd <= (REMINDER_OFFSET_DAYS[sub.planDuration] ?? 7)
  const rawTotal = priceFor(plans, goal, duration, "Basic", mealsPerDay)
  const total = rawTotal !== null && promoDiscount ? Math.max(0, rawTotal - promoDiscount) : rawTotal

  function toggleDietType(diet: DietType, checked: boolean) {
    setDietTypes((prev) => (checked ? [...prev, diet] : prev.filter((d) => d !== diet)))
  }

  const allDietsSelected = dietTypes.length === DIET_TYPES.length
  function toggleEverything() {
    setDietTypes(allDietsSelected ? [] : [...DIET_TYPES])
  }

  async function applyPromo() {
    if (!promoInput.trim()) return
    setApplyingPromo(true)
    setPromoError("")
    try {
      const result = await api.post<{ valid: boolean; discountAmount: number }>("/promo-codes/validate", {
        code: promoInput.trim(),
        goal: GOAL_TO_ENUM[goal],
        tier: TIER_TO_ENUM["Basic"],
        planDuration: duration,
        mealsPerDay,
        customerId: authCustomer?.id,
      })
      setPromoCode(promoInput.trim())
      setPromoDiscount(result.discountAmount)
    } catch (err) {
      setPromoCode(null)
      setPromoDiscount(null)
      setPromoError(err instanceof ApiError ? err.message : "Couldn't apply that code — try again.")
    } finally {
      setApplyingPromo(false)
    }
  }

  // Worldpay redirects back here (not a separate return page — this form already lives
  // where the renewal started) after the customer finishes on the hosted payment page.
  useEffect(() => {
    if (!searchParams.get("renewalPending")) return
    setRenewing(true)
    confirmRenewal()
      .then(() => {
        setConfirmed(true)
        setTimeout(() => setConfirmed(false), 8000)
      })
      .catch(() => setError("Couldn't renew your subscription — try again."))
      .finally(() => {
        setRenewing(false)
        setSearchParams({}, { replace: true })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleRenew(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setRenewing(true)
    try {
      await renew(duration, mealsPerDay, goal, dietTypes, allergens, "Daily", promoCode ?? undefined)
      setConfirmed(true)
      setTimeout(() => setConfirmed(false), 8000)
      setRenewing(false)
    } catch {
      setError("Couldn't renew your subscription — try again.")
      setRenewing(false)
    }
  }

  function cancelEditing() {
    setDuration(sub.planDuration)
    setMealsPerDay(sub.mealsPerDay)
    setGoal(sub.goal)
    setDietTypes(sub.dietTypes)
    setAllergens(sub.allergens)
    setNoAllergies(sub.allergens.length === 0)
    setEditingPreferences(false)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl text-ink mb-1">Subscription Management</h1>
        <p className="text-ink-muted">Renew your plan, or update the preferences it uses.</p>
      </div>

      {confirmed && (
        <div role="status" className="rounded-lg bg-olive-50 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-olive-600 shrink-0" />
          <p className="text-sm font-medium text-olive-700">Renewed — you're still logged in, no need to sign in again.</p>
        </div>
      )}

      {isExpired && (
        <Card className="p-5 bg-coral-50 border-coral-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-coral-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-coral-600">Your plan has expired</p>
              <p className="text-sm text-ink-muted mt-1">
                Deliveries have stopped, but your account and data are still here — renew any time to
                pick up where you left off. If your plan stays inactive for a while, we'll email you
                about closing the account, with the option to export or delete your data first.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg text-ink mb-4">Current plan</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <dt className="text-xs text-ink-muted uppercase tracking-wide">Status</dt>
            <dd className="mt-1"><Badge variant={isExpired ? "coral" : "olive"}>{isExpired ? "Expired" : "Active"}</Badge></dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted uppercase tracking-wide">Length</dt>
            <dd className="mt-1 text-ink font-medium">{sub.planDuration} days</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted uppercase tracking-wide">Ends</dt>
            <dd className="mt-1 text-ink font-medium">{new Date(endDate).toLocaleDateString("en-GB")}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted uppercase tracking-wide">Meals/day</dt>
            <dd className="mt-1 text-ink font-medium">{sub.mealsPerDay}</dd>
          </div>
        </dl>
      </Card>

      {showRenewal && (
      <form onSubmit={handleRenew}>
        <Card className="p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg text-ink mb-1">Renew your subscription</h2>
            <p className="text-sm text-ink-muted mb-4">Your goal, diet, and allergy preferences carry over — edit them below if anything's changed.</p>
          </div>

          {!editingPreferences ? (
            <div className="rounded-xl border border-border bg-cream-100 p-5">
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <dt className="text-xs text-ink-muted uppercase tracking-wide">Length</dt>
                  <dd className="mt-0.5 text-ink font-medium">{duration} days</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted uppercase tracking-wide">Meals/day</dt>
                  <dd className="mt-0.5 text-ink font-medium">{mealsPerDay}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted uppercase tracking-wide">Goal</dt>
                  <dd className="mt-0.5 text-ink font-medium">{goal}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted uppercase tracking-wide">Diet</dt>
                  <dd className="mt-0.5 text-ink font-medium">{dietTypes.join(", ")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted uppercase tracking-wide">Allergens</dt>
                  <dd className="mt-0.5 text-ink font-medium">{allergens.length ? allergens.join(", ") : "Nothing"}</dd>
                </div>
              </dl>
              <Button type="button" variant="accent" size="sm" onClick={() => setEditingPreferences(true)}>
                Renew plan
              </Button>
            </div>
          ) : (
            <>
              <div>
                <Label id="duration-label">New plan length</Label>
                <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-labelledby="duration-label">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={duration === d}
                      onClick={() => setDuration(d)}
                      className={cn(
                        "rounded-xl border-2 py-4 font-semibold transition-colors cursor-pointer",
                        duration === d ? "border-olive-600 bg-olive-50 text-olive-700" : "border-border text-ink hover:border-olive-300"
                      )}
                    >
                      {d} days
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label id="meals-label">Meals per day</Label>
                <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-labelledby="meals-label">
                  {MEALS_OPTIONS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={mealsPerDay === m}
                      onClick={() => setMealsPerDay(m)}
                      className={cn(
                        "rounded-xl border-2 py-4 font-semibold transition-colors cursor-pointer",
                        mealsPerDay === m ? "border-olive-600 bg-olive-50 text-olive-700" : "border-border text-ink hover:border-olive-300"
                      )}
                    >
                      {m} meal{m > 1 ? "s" : ""}/day
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label id="goal-label">Goal</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="radiogroup" aria-labelledby="goal-label">
                  {GOALS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      role="radio"
                      aria-checked={goal === g.id}
                      onClick={() => setGoal(g.id)}
                      className={cn(
                        "rounded-lg border-2 py-3 px-2 text-sm font-medium transition-colors cursor-pointer",
                        goal === g.id ? "border-olive-600 bg-olive-50 text-olive-700" : "border-border text-ink hover:border-olive-300"
                      )}
                    >
                      {g.id}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label id="diet-label">Preferred food category</Label>
                <p className="text-xs text-ink-muted -mt-1 mb-3">Select as many as apply — we'll draw your menu from all of them.</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3" role="group" aria-labelledby="diet-label">
                  {DIET_TYPES.map((d) => {
                    const active = dietTypes.includes(d)
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleDietType(d, !active)}
                        className={cn(
                          "rounded-lg border-2 py-3 text-sm font-medium transition-colors cursor-pointer",
                          active ? "border-olive-600 bg-olive-50 text-olive-700" : "border-border text-ink hover:border-olive-300"
                        )}
                      >
                        {d}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    aria-pressed={allDietsSelected}
                    onClick={toggleEverything}
                    className={cn(
                      "rounded-lg border-2 py-3 text-sm font-medium transition-colors cursor-pointer",
                      allDietsSelected ? "border-olive-600 bg-olive-50 text-olive-700" : "border-border text-ink hover:border-olive-300"
                    )}
                  >
                    Everything
                  </button>
                </div>
              </div>

              <div>
                <Label>Any allergens to avoid?</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {ALLERGENS.map((allergen) => (
                    <div key={allergen} className="flex items-center gap-2.5">
                      <Checkbox
                        id={`renew-allergen-${allergen}`}
                        checked={allergens.includes(allergen)}
                        disabled={noAllergies}
                        onCheckedChange={(v) => {
                          setAllergens((prev) => (v === true ? [...prev, allergen] : prev.filter((a) => a !== allergen)))
                          setNoAllergies(false)
                        }}
                      />
                      <Label htmlFor={`renew-allergen-${allergen}`} className="mb-0 font-normal cursor-pointer">{allergen}</Label>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2.5 border-t border-border pt-4">
                  <Checkbox
                    id="renew-no-allergies"
                    checked={noAllergies}
                    onCheckedChange={(v) => {
                      const checked = v === true
                      setNoAllergies(checked)
                      if (checked) setAllergens([])
                    }}
                  />
                  <Label htmlFor="renew-no-allergies" className="mb-0 font-normal cursor-pointer">
                    I confirm I have no food allergies
                  </Label>
                </div>
              </div>
            </>
          )}

          {editingPreferences && (
            <>
              <div className="space-y-2">
                <Label htmlFor="renew-promo">Promo code</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="renew-promo"
                    placeholder="Promo code"
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value)
                      setPromoError("")
                    }}
                    className="flex-1 sm:max-w-xs"
                  />
                  <Button type="button" variant="outline" size="sm" disabled={!promoInput.trim() || applyingPromo} onClick={applyPromo}>
                    {applyingPromo ? "Applying…" : "Apply"}
                  </Button>
                </div>
                {promoError && <p className="text-xs text-coral-600">{promoError}</p>}
                {promoDiscount ? <p className="text-xs text-olive-600">Promo code applied — {formatGBP(promoDiscount)} off</p> : null}
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-olive-50 p-4">
                <ShieldCheck className="h-5 w-5 text-olive-600 shrink-0 mt-0.5" />
                <p className="text-sm text-ink-muted">
                  You'll be redirected to Worldpay's secure payment page to complete this charge — we never see or store your card number.
                </p>
              </div>

              {error && (
                <div role="alert" className="rounded-lg bg-coral-50 p-4 text-sm text-coral-600 font-medium">{error}</div>
              )}

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
                <Button type="button" variant="outline" size="lg" onClick={cancelEditing}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  className="flex-1 sm:flex-none"
                  disabled={renewing || total === null || dietTypes.length === 0 || (!noAllergies && allergens.length === 0)}
                >
                  {renewing
                    ? "Renewing…"
                    : total !== null
                      ? promoDiscount
                        ? `Confirm & renew · ${formatGBP(total)} (was ${formatGBP(rawTotal!)})`
                        : `Confirm & renew · ${formatGBP(total)}`
                      : "Confirm & renew"}
                </Button>
              </div>
            </>
          )}
        </Card>
      </form>
      )}
    </div>
  )
}

export default Subscription
