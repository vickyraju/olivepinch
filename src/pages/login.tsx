import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Lock, Phone } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PhoneInput } from "@/components/ui/phone-input"
import { FieldError } from "@/components/ui/field-error"
import { Logo } from "@/components/ui/logo"
import { FoodPhoto } from "@/components/ui/food-photo"

function Login() {
  const { isAuthenticated, authError, accountNotFound, sendOtp, verifyOtp, clearAuthError } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [stage, setStage] = useState<"phone" | "otp">("phone")
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard")
  }, [isAuthenticated, navigate])

  // Discard a previous visit's leftover error/redirect state so returning to this
  // page (e.g. after being sent to /subscribe) starts clean instead of re-firing it.
  useEffect(() => {
    clearAuthError()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!authError) return
    if (accountNotFound) {
      setError("Looks like you don't have a plan with us yet — taking you to get started…")
      const timer = setTimeout(() => navigate("/subscribe"), 2500)
      return () => clearTimeout(timer)
    }
    setError(authError)
  }, [authError, accountNotFound, navigate])

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSending(true)
    try {
      await sendOtp(phone)
      setStage("otp")
      setResendCooldown(30)
    } catch {
      setError("Couldn't send a code to that number — check it and try again.")
    } finally {
      setSending(false)
    }
  }

  async function handleResend() {
    setError("")
    setCode("")
    setSending(true)
    try {
      await sendOtp(phone)
      setResendCooldown(30)
    } catch {
      setError("Couldn't resend the code — try again in a moment.")
    } finally {
      setSending(false)
    }
  }

  async function verifyCode() {
    setError("")
    setVerifying(true)
    try {
      await verifyOtp(code)
      // isAuthenticated flips once link-account + profile load resolve — the effect above navigates.
    } catch {
      setError("That code isn't right — check your phone and try again.")
      setVerifying(false)
    }
  }

  function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    verifyCode()
  }

  useEffect(() => {
    if (stage === "otp" && code.length === 6 && !verifying) verifyCode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      <div className="flex min-h-dvh lg:min-h-0 items-center justify-center bg-cream px-5 py-16 sm:px-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 inline-block">
            <Logo className="text-2xl" />
          </Link>

          <h1 className="text-3xl sm:text-4xl text-ink mb-2">Welcome back</h1>
          <p className="text-ink-muted mb-8">
            {stage === "phone" && "Log in to manage your deliveries, pause a week, or renew your plan."}
            {stage === "otp" && <>We've sent a 6-digit code to <strong className="text-ink">{phone.replace(/^(\+44)(\d)/, "$1 $2")}</strong>.</>}
          </p>

          {stage === "phone" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone number</Label>
                <PhoneInput id="phone" value={phone} onChange={setPhone} />
              </div>
              <FieldError>{error}</FieldError>
              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={sending || !phone.trim()}>
                <Phone className="h-4 w-4" />
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
              <div className="flex items-center justify-center gap-1 text-sm">
                <span className="text-ink-muted">Didn't get a code?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || sending}
                  className="font-medium text-olive-600 underline disabled:no-underline disabled:text-ink-muted disabled:cursor-not-allowed cursor-pointer"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setStage("phone"); setCode(""); setError(""); setResendCooldown(0) }}
                className="w-full text-center text-sm text-ink-muted hover:text-ink cursor-pointer"
              >
                Use a different number
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-ink-muted">
            New to OlivePinch? <Link to="/subscribe" className="text-olive-600 font-medium underline">Check your postcode</Link>
          </p>

          <div id="recaptcha-container" />
        </div>
      </div>

      <div className="hidden lg:block relative">
        <FoodPhoto
          seed={0}
          src="/images/login-hero.jpg"
          alt="Grilled chicken meal-prep bowl with roasted vegetables and quinoa"
          className="absolute inset-0 h-full w-full rounded-none"
        />
      </div>
    </div>
  )
}

export default Login
