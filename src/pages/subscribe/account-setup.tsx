import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Mail } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FieldError } from "@/components/ui/field-error"
import { useSubscribe } from "@/lib/subscribe-context"
import { GOAL_TO_ENUM, DIET_TO_ENUM } from "@/lib/enum-map"
import { api, ApiError } from "@/lib/api"
import { StepNav } from "./step-nav"

function AccountSetup() {
  const { state, update } = useSubscribe()
  const navigate = useNavigate()
  const [email, setEmail] = useState(state.profile.email)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const canContinue = /\S+@\S+\.\S+/.test(email)

  async function handleContinue() {
    if (!state.goal || !state.dietType) return
    setError("")
    setSaving(true)
    try {
      const p = state.profile
      const res = await api.post<{ customerId: string }>("/customers/provisional", {
        fullName: p.fullName.trim(),
        email: email.trim(),
        gender: p.gender || undefined,
        age: Number(p.age),
        heightCm: Number(p.heightCm),
        weightKg: Number(p.weightKg),
        healthConsent: true,
        marketingOptIn: false,
      })
      // Goal/diet/allergens were picked several steps ago in "Choose" but couldn't be saved
      // until now — that PATCH is customer-scoped, and this is the first point a customerId exists.
      await api.patch(`/customers/${res.customerId}/preferences`, {
        goal: GOAL_TO_ENUM[state.goal],
        dietType: DIET_TO_ENUM[state.dietType],
        allergens: state.allergens,
        postcode: state.postcode,
      })
      update({ profile: { ...p, email: email.trim() }, customerId: res.customerId })
      navigate("/subscribe/payment")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your details — try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-olive-50">
          <Mail className="h-6 w-6 text-olive-600" />
        </div>
        <h1 className="text-3xl sm:text-4xl text-ink">You're almost there</h1>
        <p className="mt-3 text-ink-muted">This becomes your login — no password needed, we'll email you a code.</p>
      </div>

      <div className="rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-soft">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!error}
        />
        <FieldError>{error}</FieldError>
      </div>

      <StepNav
        backTo="/subscribe/profile"
        continueDisabled={!canContinue || saving}
        continueLabel={saving ? "Saving…" : "Continue"}
        onContinue={handleContinue}
      />
    </div>
  )
}

export default AccountSetup
