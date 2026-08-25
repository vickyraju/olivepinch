import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field-error"
import { useSubscribe } from "@/lib/subscribe-context"
import { GOAL_TO_ENUM, DIET_TO_ENUM } from "@/lib/enum-map"
import { api, ApiError } from "@/lib/api"
import { StepNav } from "./step-nav"

const PERKS = [
  "Meals matched to your goal, diet, and BMI",
  "Pause up to 4 times a month — never lose a meal you've paid for",
  "Your health data stays yours — export or delete it any time",
]

function AccountSetup() {
  const { state, update } = useSubscribe()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleContinue() {
    if (!state.goal || state.dietTypes.length === 0) return
    setError("")
    setSaving(true)
    try {
      const p = state.profile
      const res = await api.post<{ customerId: string }>("/customers/provisional", {
        fullName: p.fullName.trim(),
        phone: p.phone.trim(),
        gender: p.gender || undefined,
        dateOfBirth: p.dateOfBirth,
        heightCm: Number(p.heightCm),
        weightKg: Number(p.weightKg),
        healthConsent: true,
        marketingOptIn: false,
      })
      // Goal/diet/allergens were picked several steps ago in "Choose" but couldn't be saved
      // until now — that PATCH is customer-scoped, and this is the first point a customerId exists.
      await api.patch(`/customers/${res.customerId}/preferences`, {
        goal: GOAL_TO_ENUM[state.goal],
        dietTypes: state.dietTypes.map((d) => DIET_TO_ENUM[d]),
        allergens: state.allergens,
        postcode: state.postcode,
      })
      update({ customerId: res.customerId })
      navigate("/subscribe/delivery")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your details — try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <h1 className="text-3xl sm:text-4xl text-ink mb-2">You're almost there!</h1>
        <p className="text-ink-muted mb-8">Continue to make progress on your fitness journey.</p>

        <FieldError>{error}</FieldError>

        <Button
          type="button"
          variant="accent"
          size="lg"
          className="w-full"
          disabled={saving}
          onClick={handleContinue}
        >
          {saving ? "Saving…" : "Continue"}
        </Button>

        <StepNav backTo="/subscribe/profile" hideContinue />
      </div>

      <div className="rounded-2xl bg-olive-50 border border-olive-100 p-8">
        <h2 className="text-xl text-ink mb-5">Join OlivePinch</h2>
        <ul className="space-y-4">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-olive-600 shrink-0 mt-0.5" />
              <span className="text-ink-muted">{perk}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default AccountSetup
