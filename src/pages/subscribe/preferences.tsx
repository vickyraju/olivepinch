import { useNavigate } from "react-router-dom"
import { DIET_TYPES, ALLERGENS, type DietType } from "@/data/menu"
import { useSubscribe } from "@/lib/subscribe-context"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { StepNav } from "./step-nav"
import { cn } from "@/lib/utils"

function Preferences() {
  const { state, update } = useSubscribe()
  const navigate = useNavigate()

  function toggleDietType(diet: DietType, checked: boolean) {
    const next = checked ? [...state.dietTypes, diet] : state.dietTypes.filter((d) => d !== diet)
    update({ dietTypes: next })
  }

  function toggleAllergen(allergen: string, checked: boolean) {
    const next = checked
      ? [...state.allergens, allergen]
      : state.allergens.filter((a) => a !== allergen)
    update({ allergens: next, noAllergies: false })
  }

  function toggleNoAllergies(checked: boolean) {
    update({ noAllergies: checked, allergens: checked ? [] : state.allergens })
  }

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl text-ink mb-2">Food preferences &amp; allergies</h1>
      <p className="text-ink-muted mb-8">Every default menu we build will respect these choices.</p>

      <div className="rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-soft mb-6">
        <h2 className="text-lg text-ink mb-1">Preferred food category</h2>
        <p className="text-sm text-ink-muted mb-4">Select as many as you like — we'll build your menu from all of them.</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {DIET_TYPES.map((diet: DietType) => {
            const active = state.dietTypes.includes(diet)
            return (
              <button
                key={diet}
                type="button"
                aria-pressed={active}
                onClick={() => toggleDietType(diet, !active)}
                className={cn(
                  "rounded-xl border-2 py-4 text-base font-semibold transition-colors cursor-pointer",
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {ALLERGENS.map((allergen) => (
            <div key={allergen} className="flex items-center gap-2.5">
              <Checkbox
                id={`allergen-${allergen}`}
                checked={state.allergens.includes(allergen)}
                disabled={state.noAllergies}
                onCheckedChange={(v) => toggleAllergen(allergen, v === true)}
              />
              <Label htmlFor={`allergen-${allergen}`} className="mb-0 font-normal cursor-pointer">
                {allergen}
              </Label>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2.5 border-t border-border pt-4">
          <Checkbox
            id="no-allergies"
            checked={state.noAllergies}
            onCheckedChange={(v) => toggleNoAllergies(v === true)}
          />
          <Label htmlFor="no-allergies" className="mb-0 font-normal cursor-pointer">
            I confirm I have no food allergies
          </Label>
        </div>
      </div>

      <StepNav
        backTo="/subscribe/plan"
        continueDisabled={state.dietTypes.length === 0 || (!state.noAllergies && state.allergens.length === 0)}
        onContinue={() => navigate("/subscribe/menu")}
      />
    </div>
  )
}

export default Preferences
