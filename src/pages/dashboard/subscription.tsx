import { useState } from "react"
import { CheckCircle2, AlertTriangle } from "lucide-react"
import { useDashboard } from "@/lib/dashboard-context"
import { GOALS, DIET_TYPES, ALLERGENS, type Goal, type DietType } from "@/data/menu"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const DURATIONS: (7 | 14 | 28)[] = [7, 14, 28]

function Subscription() {
  const { customer, endDate, renew } = useDashboard()
  const sub = customer.subscription
  const [duration, setDuration] = useState<7 | 14 | 28>(sub.planDuration)
  const [goal, setGoal] = useState<Goal>(sub.goal)
  const [dietType, setDietType] = useState<DietType>(sub.dietType)
  const [allergens, setAllergens] = useState<string[]>(sub.allergens)
  const [confirmed, setConfirmed] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const [error, setError] = useState("")

  const isExpired = sub.status === "expired"

  async function handleRenew(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setRenewing(true)
    try {
      await renew(duration, goal, dietType, allergens)
      setConfirmed(true)
      setTimeout(() => setConfirmed(false), 4000)
    } catch {
      setError("Couldn't renew your subscription — try again.")
    } finally {
      setRenewing(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl text-ink mb-1">Subscription Management</h1>
        <p className="text-ink-muted">Renew your plan, or update the preferences it uses.</p>
      </div>

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

            <Label>New plan length</Label>
            <div className="grid grid-cols-3 gap-3">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={duration === d}
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
            <Label>Goal</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={goal === g.id}
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
            <Label>Diet type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {DIET_TYPES.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={dietType === d}
                  onClick={() => setDietType(d)}
                  className={cn(
                    "rounded-lg border-2 py-3 text-sm font-medium transition-colors cursor-pointer",
                    dietType === d ? "border-olive-600 bg-olive-50 text-olive-700" : "border-border text-ink hover:border-olive-300"
                  )}
                >
                  {d}
                </button>
              ))}
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

          {confirmed && (
            <div role="status" className="rounded-lg bg-olive-50 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-olive-600 shrink-0" />
              <p className="text-sm font-medium text-olive-700">Renewed — you're still logged in, no need to sign in again.</p>
            </div>
          )}
          {error && (
            <div role="alert" className="rounded-lg bg-coral-50 p-4 text-sm text-coral-600 font-medium">{error}</div>
          )}

          <Button type="submit" variant="accent" size="lg" className="w-full sm:w-auto" disabled={renewing}>
            {renewing ? "Renewing…" : "Confirm & renew"}
          </Button>
        </Card>
      </form>
    </div>
  )
}

export default Subscription
