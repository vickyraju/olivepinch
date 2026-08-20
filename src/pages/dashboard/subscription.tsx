import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react"
import { useDashboard } from "@/lib/dashboard-context"
import { GOALS, DIET_TYPES, ALLERGENS, type Goal, type DietType } from "@/data/menu"
import type { DeliverySlot } from "@/lib/subscribe-context"
import { usePlans, priceFor, formatGBP } from "@/lib/pricing"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const DURATIONS: (7 | 14 | 28)[] = [7, 14, 28]
const DELIVERY_SLOTS: { value: DeliverySlot; hint: string }[] = [
  { value: "Daily", hint: "A box every day" },
  { value: "Weekly", hint: "One box for the whole week" },
  { value: "Alternate days", hint: "A box every other day" },
]

function Subscription() {
  const { customer, endDate, renew, confirmRenewal } = useDashboard()
  const sub = customer.subscription
  const [duration, setDuration] = useState<7 | 14 | 28>(sub.planDuration)
  const [goal, setGoal] = useState<Goal>(sub.goal)
  const [dietTypes, setDietTypes] = useState<DietType[]>(sub.dietTypes)
  const [allergens, setAllergens] = useState<string[]>(sub.allergens)
  const [deliverySlot, setDeliverySlot] = useState<DeliverySlot>(sub.deliverySlot)
  const [editingPreferences, setEditingPreferences] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const [error, setError] = useState("")
  const [searchParams, setSearchParams] = useSearchParams()

  const plans = usePlans()
  const isExpired = sub.status === "expired"
  const total = priceFor(plans, goal, duration)

  function toggleDietType(diet: DietType, checked: boolean) {
    setDietTypes((prev) => (checked ? [...prev, diet] : prev.filter((d) => d !== diet)))
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
      await renew(duration, goal, dietTypes, allergens, deliverySlot)
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
    setGoal(sub.goal)
    setDietTypes(sub.dietTypes)
    setAllergens(sub.allergens)
    setDeliverySlot(sub.deliverySlot)
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
                Your account stays accessible in read-only mode for 3 months. We'll email a warning at the
                2-month mark before anything is deleted — renew any time to pick up where you left off.
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

      <form onSubmit={handleRenew}>
        <Card className="p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg text-ink mb-1">Renew your subscription</h2>
            <p className="text-sm text-ink-muted mb-4">Your goal, diet, and allergy preferences carry over — edit them below if anything's changed.</p>
          </div>

          {!editingPreferences ? (
            <div className="rounded-xl border border-border bg-cream-100 p-5">
              <dl className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm mb-4">
                <div>
                  <dt className="text-xs text-ink-muted uppercase tracking-wide">Length</dt>
                  <dd className="mt-0.5 text-ink font-medium">{duration} days</dd>
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
                  <dt className="text-xs text-ink-muted uppercase tracking-wide">Excludes</dt>
                  <dd className="mt-0.5 text-ink font-medium">{allergens.length ? allergens.join(", ") : "Nothing"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted uppercase tracking-wide">Delivery</dt>
                  <dd className="mt-0.5 text-ink font-medium">{deliverySlot}</dd>
                </div>
              </dl>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingPreferences(true)}>
                Edit preferences
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
                </div>
              </div>

              <div>
                <Label>Excluded allergens</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {ALLERGENS.map((allergen) => (
                    <div key={allergen} className="flex items-center gap-2.5">
                      <Checkbox
                        id={`renew-allergen-${allergen}`}
                        checked={allergens.includes(allergen)}
                        onCheckedChange={(v) =>
                          setAllergens((prev) => (v === true ? [...prev, allergen] : prev.filter((a) => a !== allergen)))
                        }
                      />
                      <Label htmlFor={`renew-allergen-${allergen}`} className="mb-0 font-normal cursor-pointer">{allergen}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label id="delivery-slot-label">Delivery frequency</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-labelledby="delivery-slot-label">
                  {DELIVERY_SLOTS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      role="radio"
                      aria-checked={deliverySlot === d.value}
                      onClick={() => setDeliverySlot(d.value)}
                      className={cn(
                        "rounded-lg border-2 py-3 px-2 text-left text-sm font-medium transition-colors cursor-pointer",
                        deliverySlot === d.value ? "border-olive-600 bg-olive-50 text-olive-700" : "border-border text-ink hover:border-olive-300"
                      )}
                    >
                      <div>{d.value}</div>
                      <div className="text-xs font-normal text-ink-muted mt-0.5">{d.hint}</div>
                    </button>
                  ))}
                </div>
              </div>

              <Button type="button" variant="ghost" size="sm" onClick={cancelEditing}>
                Cancel
              </Button>
            </>
          )}

          <div className="flex items-start gap-3 rounded-lg bg-olive-50 p-4">
            <ShieldCheck className="h-5 w-5 text-olive-600 shrink-0 mt-0.5" />
            <p className="text-sm text-ink-muted">
              You'll be redirected to Worldpay's secure payment page to complete this charge — we never see or store your card number.
            </p>
          </div>

          {error && (
            <div role="alert" className="rounded-lg bg-coral-50 p-4 text-sm text-coral-600 font-medium">{error}</div>
          )}

          <Button type="submit" variant="accent" size="lg" className="w-full sm:w-auto" disabled={renewing || total === null}>
            {renewing ? "Renewing…" : total !== null ? `Confirm & renew · ${formatGBP(total)}` : "Confirm & renew"}
          </Button>
        </Card>
      </form>
    </div>
  )
}

export default Subscription
