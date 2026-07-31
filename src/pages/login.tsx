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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 3.04c.87-2.6 3.3-4.73 6.16-4.73z" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5" aria-hidden>
      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.007 3.902-1.007.618 0 2.834.06 4.286 2.19-.108.07-2.556 1.49-2.556 4.56 0 3.61 3.157 4.9 3.216 4.92z" />
    </svg>
  )
}

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
