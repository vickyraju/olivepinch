import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field-error"
import { GoogleIcon } from "@/components/ui/social-icons"
import { useSubscribe } from "@/lib/subscribe-context"
import { useAuth, PENDING_SOCIAL_SIGNUP_KEY } from "@/lib/auth"
import { GOAL_TO_ENUM, DIET_TO_ENUM } from "@/lib/enum-map"
import { SUBSCRIBE_STORAGE_KEY } from "@/lib/subscribe-storage"
import { api, ApiError } from "@/lib/api"
import { StepNav } from "./step-nav"

const PERKS = [
  "Meals matched to your goal, diet, and BMI",
  "Pause up to 4 times a month — never lose a meal you've paid for",
  "Your health data stays yours — export or delete it any time",
]

function AccountSetup() {
  const { state, update } = useSubscribe()
  const { customer, authError, isLoading: authLoading, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(state.profile.email)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const canContinue = /\S+@\S+\.\S+/.test(email)

  // Landed back here after a Google OAuth redirect. Reads sessionStorage directly rather than
  // this funnel's own React state, since that state can lag a render behind — auth.tsx's
  // listener writes the resulting customerId straight to storage before setting `customer`, so
  // by the time `customer` is truthy the storage write has already happened; the React state
  // hasn't necessarily caught up yet. If the linked customer matches what this funnel session
  // just created, keep going. Otherwise it's a pre-existing account: if it already has a
  // subscription send it to the dashboard, but if it never subscribed (e.g. abandoned an earlier
  // checkout) resume the funnel for it rather than stranding it on an empty dashboard.
  useEffect(() => {
    if (!customer) return
    const raw = sessionStorage.getItem(SUBSCRIBE_STORAGE_KEY)
    const storedCustomerId = raw ? (JSON.parse(raw).customerId as string | null) : null
    if (storedCustomerId === customer.id) {
      navigate("/subscribe/delivery")
      return
    }
    ;(async () => {
      try {
        await api.get("/subscriptions/current")
        navigate("/dashboard")
        return
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) {
          navigate("/dashboard")
          return
        }
      }
      if (!state.goal || state.dietTypes.length === 0) {
        navigate("/subscribe")
        return
      }
      try {
        const { signupToken } = await api.post<{ signupToken: string }>("/customers/me/signup-session")
        await api.patch(
          `/customers/${customer.id}/preferences`,
          {
            goal: GOAL_TO_ENUM[state.goal],
            dietTypes: state.dietTypes.map((d) => DIET_TO_ENUM[d]),
            allergens: state.allergens,
            postcode: state.postcode,
          },
          { Authorization: `Bearer ${signupToken}` }
        )
        update({ customerId: customer.id, signupToken, profile: { ...state.profile, email: customer.email } })
        navigate("/subscribe/delivery")
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Couldn't resume your signup — try again.")
      }
    })()
    // Runs once per sign-in; the funnel state it reads is stable by the time `customer` resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer])

  useEffect(() => {
    if (authError) setError(authError)
  }, [authError])

  async function handleContinue() {
    if (!state.goal || state.dietTypes.length === 0) return
    setError("")
    setSaving(true)
    try {
      const p = state.profile
      const res = await api.post<{ customerId: string; signupToken: string }>("/customers/provisional", {
        fullName: p.fullName.trim(),
        email: email.trim(),
        phone: p.phone.trim() || undefined,
        gender: p.gender || undefined,
        dateOfBirth: p.dateOfBirth,
        heightCm: Number(p.heightCm),
        weightKg: Number(p.weightKg),
        healthConsent: true,
        marketingOptIn: false,
      })
      // Goal/diet/allergens were picked several steps ago in "Choose" but couldn't be saved
      // until now — that PATCH is customer-scoped, and this is the first point a customerId exists.
      await api.patch(
        `/customers/${res.customerId}/preferences`,
        {
          goal: GOAL_TO_ENUM[state.goal],
          dietTypes: state.dietTypes.map((d) => DIET_TO_ENUM[d]),
          allergens: state.allergens,
          postcode: state.postcode,
        },
        { Authorization: `Bearer ${res.signupToken}` }
      )
      update({ profile: { ...p, email: email.trim() }, customerId: res.customerId, signupToken: res.signupToken })
      navigate("/subscribe/delivery")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your details — try again.")
    } finally {
      setSaving(false)
    }
  }

  async function handleGoogle() {
    setError("")
    sessionStorage.setItem(PENDING_SOCIAL_SIGNUP_KEY, "1")
    try {
      await signInWithGoogle("/subscribe/account-setup")
      // Browser navigates away to Google on success — nothing more to do here.
    } catch {
      sessionStorage.removeItem(PENDING_SOCIAL_SIGNUP_KEY)
      setError("Couldn't continue with Google — try again.")
    }
  }

  if (authLoading) {
    return <p className="text-center text-ink-muted py-24">Signing you in…</p>
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <h1 className="text-3xl sm:text-4xl text-ink mb-2">You're almost there!</h1>
        <p className="text-ink-muted mb-8">Continue to make progress on your fitness journey.</p>

        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="w-full border border-border text-ink hover:bg-cream-100"
          onClick={handleGoogle}
        >
          <GoogleIcon /> Continue with Google
        </Button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-ink-muted">OR</span>
          <div className="h-px flex-1 bg-border" />
        </div>

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
