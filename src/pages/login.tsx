import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Lock, Mail } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FieldError } from "@/components/ui/field-error"
import { Logo } from "@/components/ui/logo"
import { FoodPhoto } from "@/components/ui/food-photo"
import { GoogleIcon, AppleIcon } from "@/components/ui/social-icons"

function Login() {
  const { isAuthenticated, authError, sendOtp, verifyOtp, signInWithGoogle, signInWithApple } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [stage, setStage] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState(searchParams.get("email") ?? "")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard")
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (authError) setError(authError)
  }, [authError])

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSending(true)
    try {
      await sendOtp(email)
      setStage("otp")
    } catch {
      setError("Couldn't send a code to that address — check it and try again.")
    } finally {
      setSending(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setVerifying(true)
    try {
      await verifyOtp(email, code)
      // isAuthenticated flips once link-account + profile load resolve — the effect above navigates.
    } catch {
      setError("That code isn't right — check your email and try again.")
      setVerifying(false)
    }
  }

  async function handleSocial(signIn: () => Promise<void>, label: string) {
    setError("")
    try {
      await signIn()
    } catch {
      setError(`Couldn't start ${label} sign-in — try again.`)
    }
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      <div className="flex min-h-dvh lg:min-h-0 items-center justify-center bg-cream px-5 py-16 sm:px-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 inline-block">
            <Logo className="text-2xl" />
          </Link>

          <h1 className="text-3xl sm:text-4xl text-ink mb-2">Welcome back</h1>
          <p className="text-ink-muted mb-8">
            {stage === "email"
              ? "Log in to manage your deliveries, pause a week, or renew your plan."
              : <>We've sent a 6-digit code to <strong className="text-ink">{email}</strong>.</>}
          </p>

          {stage === "email" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <FieldError>{error}</FieldError>
              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={sending}>
                <Mail className="h-4 w-4" />
                {sending ? "Sending code…" : "Send code"}
              </Button>
            </form>
          )}

          {stage === "otp" && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <Label htmlFor="code">6-digit code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="tracking-[0.5em] text-center text-lg"
                />
              </div>
              <FieldError>{error}</FieldError>
              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={verifying || code.length !== 6}>
                <Lock className="h-4 w-4" />
                {verifying ? "Verifying…" : "Verify code"}
              </Button>
              <button
                type="button"
                onClick={() => { setStage("email"); setCode(""); setError("") }}
                className="w-full text-center text-sm text-ink-muted hover:text-ink cursor-pointer"
              >
                Use a different email
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-ink-muted">
            New to OlivePinch? <Link to="/subscribe" className="text-olive-600 font-medium underline">Check your postcode</Link>
          </p>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-ink-muted">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="mt-6 space-y-3">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="w-full border border-border text-ink hover:bg-cream-100"
              onClick={() => handleSocial(signInWithGoogle, "Google")}
            >
              <GoogleIcon /> Continue with Google
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="w-full border border-border text-ink hover:bg-cream-100"
              onClick={() => handleSocial(signInWithApple, "Apple")}
            >
              <AppleIcon /> Continue with Apple
            </Button>
          </div>
        </div>
      </div>

      {/* Reference: swap FoodPhoto's placeholder for a real lifestyle/kitchen photo (src prop) when one's ready. Desktop only, per design brief. */}
      <div className="hidden lg:block relative">
        <FoodPhoto seed={0} alt="" className="absolute inset-0 h-full w-full rounded-none" />
      </div>
    </div>
  )
}

export default Login
