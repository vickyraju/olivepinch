import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field-error"
import { PhoneInput } from "@/components/ui/phone-input"
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
  const [phone, setPhone] = useState(state.profile.phone)
  const [email, setEmail] = useState(state.profile.email)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const canContinue = !!phone.trim() && (!email.trim() || /\S+@\S+\.\S+/.test(email))

  async function handleContinue() {
    if (!state.goal || state.dietTypes.length === 0 || !canContinue) return
    setError("")
    setSaving(true)
    try {
      const p = state.profile
      const res = await api.post<{ customerId: string }>("/customers/provisional", {
        fullName: p.fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
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
      update({ profile: { ...p, phone: phone.trim(), email: email.trim() }, customerId: res.customerId })
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

        <div className="space-y-4">
          <div>
            <Label htmlFor="phone">Phone number</Label>
            <PhoneInput id="phone" value={phone} onChange={setPhone} />
            <p className="mt-1 text-xs text-ink-muted">You'll use this to log in — we'll text you a code next time.</p>
          </div>

          <div>
            <Label htmlFor="email">Email address <span className="text-ink-muted font-normal">(optional)</span></Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!error}
            />
          </div>
        </div>
        <FieldError>{error}</FieldError>

        <Button
          type="button"
          variant="accent"
          size="lg"
          className="w-full mt-5"
          disabled={!canContinue || saving}
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
