import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle2, Target, ChefHat, Truck, Activity } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field-error"
import { GoogleIcon, AppleIcon } from "@/components/ui/social-icons"
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

const HOW_IT_WORKS = [
  { icon: Target, title: "Goal-matched menu", description: "Built from your goal, diet, and allergies." },
  { icon: ChefHat, title: "Freshly prepared", description: "Chef-prepared each morning, delivered chilled." },
  { icon: Truck, title: "Flexible delivery", description: "Pick your start date, pause anytime." },
  { icon: Activity, title: "Track your progress", description: "Log your BMI and meals from your dashboard." },
]

function AccountSetup() {
  const { state, update } = useSubscribe()
  const { customer, authError, isLoading: authLoading, signInWithGoogle, signInWithApple } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(state.profile.email)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const canContinue = /\S+@\S+\.\S+/.test(email)

  // Landed back here after an OAuth redirect. Reads sessionStorage directly rather than this
  // funnel's own React state, since that state can lag a render behind — auth.tsx's listener
  // writes the resulting customerId straight to storage before setting `customer`, so by the
  // time `customer` is truthy the storage write has already happened; the React state hasn't
  // necessarily caught up yet (that sync lives in subscribe-context.tsx, for pages after this one).
  // If the linked customer matches what this funnel session just created, keep going; if it's a
  // *different*, pre-existing account, don't silently continue the funnel as someone else.
  useEffect(() => {
    if (!customer) return
    const raw = sessionStorage.getItem(SUBSCRIBE_STORAGE_KEY)
    const storedCustomerId = raw ? (JSON.parse(raw).customerId as string | null) : null
    navigate(storedCustomerId === customer.id ? "/subscribe/delivery" : "/dashboard")
  }, [customer, navigate])

  useEffect(() => {
    if (authError) setError(authError)
  }, [authError])

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
      navigate("/subscribe/delivery")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your details — try again.")
    } finally {
      setSaving(false)
    }
  }

  async function handleSocial(provider: "google" | "apple") {
    setError("")
    sessionStorage.setItem(PENDING_SOCIAL_SIGNUP_KEY, "1")
    try {
      if (provider === "google") await signInWithGoogle("/subscribe/account-setup")
      else await signInWithApple("/subscribe/account-setup")
      // Browser navigates away to the provider on success — nothing more to do here.
    } catch {
      sessionStorage.removeItem(PENDING_SOCIAL_SIGNUP_KEY)
      setError(`Couldn't continue with ${provider === "google" ? "Google" : "Apple"} — try again.`)
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

        <div className="space-y-3">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full border border-border text-ink hover:bg-cream-100"
            onClick={() => handleSocial("apple")}
          >
            <AppleIcon /> Continue with Apple
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full border border-border text-ink hover:bg-cream-100"
            onClick={() => handleSocial("google")}
          >
            <GoogleIcon /> Continue with Google
          </Button>
        </div>

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

      <div className="space-y-6">
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

        <div className="rounded-2xl bg-cream-100 border border-border p-8">
          <h2 className="text-xl text-ink mb-5">How does it work?</h2>
          <div className="grid grid-cols-2 gap-6">
            {HOW_IT_WORKS.map(({ icon: Icon, title, description }) => (
              <div key={title}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-border mb-3">
                  <Icon className="h-4.5 w-4.5 text-olive-600" strokeWidth={1.75} />
                </div>
                <h3 className="text-sm font-semibold text-ink mb-1">{title}</h3>
                <p className="text-xs text-ink-muted leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountSetup
