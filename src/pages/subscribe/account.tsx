import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle2, Mail, Lock } from "lucide-react"
import { useSubscribe } from "@/lib/subscribe-context"
import { useAuth } from "@/lib/auth"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field-error"

function Account() {
  const { state, reset } = useSubscribe()
  const { isAuthenticated, authError, sendOtp, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const email = state.profile.email || "your email"

  // A customer who signed up via Google in the account-setup step is already authenticated
  // by the time they land here (post-payment) — skip straight to "done" instead of sending
  // a redundant email OTP.
  const [stage, setStage] = useState<"sending" | "otp" | "verifying" | "done">(isAuthenticated ? "done" : "sending")
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  useEffect(() => {
    if (isAuthenticated) {
      setStage("done")
      return
    }
    sendOtp(email)
      .then(() => { setStage("otp"); setResendCooldown(30) })
      .catch(() => {
        setError("Couldn't send your verification code — try again.")
        setStage("otp")
      })
    // Only ever send once per visit to this page, regardless of email prop identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleResend() {
    setError("")
    setOtp("")
    try {
      await sendOtp(email)
      setResendCooldown(30)
    } catch {
      setError("Couldn't resend the code — try again in a moment.")
    }
  }

  useEffect(() => {
    if (isAuthenticated && stage === "verifying") setStage("done")
  }, [isAuthenticated, stage])

  useEffect(() => {
    if (authError) {
      setError(authError)
      setStage("otp")
    }
  }, [authError])

  async function verifyCode() {
    setError("")
    setStage("verifying")
    try {
      await verifyOtp(email, otp)
      // isAuthenticated flips once link-account + profile load resolve — the effect above advances to "done".
    } catch {
      setError("That code isn't right — check your email and try again.")
      setStage("otp")
    }
  }

  function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    verifyCode()
  }

  useEffect(() => {
    if (stage === "otp" && otp.length === 6) verifyCode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp])

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-olive-50">
          {(stage === "sending" || stage === "otp" || stage === "verifying") && <Mail className="h-6 w-6 text-olive-600" />}
          {stage === "done" && <CheckCircle2 className="h-6 w-6 text-olive-600" />}
        </div>
        <h1 className="text-3xl text-ink">
          {stage === "sending" && "Sending your code…"}
          {(stage === "otp" || stage === "verifying") && "Verify your email"}
          {stage === "done" && "You're all set"}
        </h1>
        <p className="mt-3 text-ink-muted">
          {stage === "sending" && "Payment successful — just a moment."}
          {(stage === "otp" || stage === "verifying") && <>We've sent a 6-digit code to <strong className="text-ink">{email}</strong>.</>}
          {stage === "done" && "Your OlivePinch account and subscription are ready."}
        </p>
      </div>

      {(stage === "otp" || stage === "verifying") && (
        <form onSubmit={handleVerify} className="rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-soft">
          <Label htmlFor="otp">6-digit code</Label>
          <Input
            id="otp"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            className="tracking-[0.5em] text-center text-lg"
          />
          <FieldError>{error}</FieldError>
          <Button type="submit" variant="accent" size="lg" className="w-full mt-5" disabled={stage === "verifying" || otp.length !== 6}>
            <Lock className="h-4 w-4" />
            {stage === "verifying" ? "Verifying…" : "Verify code"}
          </Button>
          <div className="mt-4 flex items-center justify-center gap-1 text-sm">
            <span className="text-ink-muted">Didn't get a code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || stage === "verifying"}
              className="font-medium text-olive-600 underline disabled:no-underline disabled:text-ink-muted disabled:cursor-not-allowed cursor-pointer"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
            </button>
          </div>
        </form>
      )}

      {stage === "done" && (
        <div className="rounded-2xl bg-surface border border-border p-8 shadow-soft text-center">
          <p className="text-sm text-ink-muted mb-6">
            Manage your subscription, pause a week, or renew any time from your dashboard.
          </p>
          <Button
            variant="accent"
            size="lg"
            className="w-full"
            onClick={() => {
              reset()
              navigate("/dashboard")
            }}
          >
            Go to your dashboard
          </Button>
        </div>
      )}
    </div>
  )
}

export default Account
