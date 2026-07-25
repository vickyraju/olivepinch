import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { DIET_TYPES, ALLERGENS, type DietType } from "@/data/menu"
import { useSubscribe } from "@/lib/subscribe-context"
import { GOAL_TO_ENUM, DIET_TO_ENUM } from "@/lib/enum-map"
import { api, ApiError } from "@/lib/api"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { FieldError } from "@/components/ui/field-error"
import { StepNav } from "./step-nav"
import { cn } from "@/lib/utils"

function Preferences() {
  const { state, update } = useSubscribe()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function toggleAllergen(allergen: string, checked: boolean) {
    const next = checked
      ? [...state.allergens, allergen]
      : state.allergens.filter((a) => a !== allergen)
    update({ allergens: next })
  }

  async function handleContinue() {
    if (!state.goal || !state.dietType || !state.customerId) return
    setError("")
    setSaving(true)
    try {
      await api.patch(`/customers/${state.customerId}/preferences`, {
        goal: GOAL_TO_ENUM[state.goal],
        dietType: DIET_TO_ENUM[state.dietType],
        allergens: state.allergens,
        postcode: state.postcode,
      })
      navigate("/subscribe/meals")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your preferences — try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl text-ink mb-2">Food preferences &amp; allergies</h1>
      <p className="text-ink-muted mb-8">Every default menu we build will respect these choices.</p>

      <div className="rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-soft mb-6">
        <h2 className="text-lg text-ink mb-4">Preferred food category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {DIET_TYPES.map((diet: DietType) => {
            const active = state.dietType === diet
            return (
              <button
                key={diet}
                type="button"
                aria-pressed={active}
                onClick={() => update({ dietType: diet })}
                className={cn(
                  "rounded-xl border-2 py-4 text-sm font-semibold transition-colors cursor-pointer",
                  active ? "border-olive-600 bg-olive-50 text-olive-700" : "border-border text-ink hover:border-olive-300"
                )}
              >
                {diet}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-soft">
        <h2 className="text-lg text-ink mb-1">Exclude allergens</h2>
        <p className="text-sm text-ink-muted mb-4">Select anything you need us to keep out of your meals.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ALLERGENS.map((allergen) => (
            <div key={allergen} className="flex items-center gap-2.5">
              <Checkbox
                id={`allergen-${allergen}`}
                checked={state.allergens.includes(allergen)}
                onCheckedChange={(v) => toggleAllergen(allergen, v === true)}
              />
              <Label htmlFor={`allergen-${allergen}`} className="mb-0 font-normal cursor-pointer">
                {allergen}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <FieldError>{error}</FieldError>
      <StepNav
        backTo="/subscribe/goal"
        continueDisabled={!state.dietType || saving}
        continueLabel={saving ? "Saving…" : "Continue"}
        onContinue={handleContinue}
      />
    </div>
  )
}

export default Preferences
