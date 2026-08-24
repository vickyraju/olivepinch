import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle2, Phone, Lock } from "lucide-react"
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
  const phone = state.profile.phone

  const [stage, setStage] = useState<"sending" | "otp" | "verifying" | "done">("sending")
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    sendOtp(phone)
      .then(() => setStage("otp"))
      .catch(() => {
        setError("Couldn't send your verification code — try again.")
        setStage("otp")
      })
    // Only ever send once per visit to this page, regardless of email prop identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isAuthenticated && stage === "verifying") setStage("done")
  }, [isAuthenticated, stage])

  useEffect(() => {
    if (authError) {
      setError(authError)
      setStage("otp")
    }
  }, [authError])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setStage("verifying")
    try {
      await verifyOtp(otp)
      // isAuthenticated flips once link-account + profile load resolve — the effect above advances to "done".
    } catch {
      setError("That code isn't right — check your phone and try again.")
      setStage("otp")
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-olive-50">
          {(stage === "sending" || stage === "otp" || stage === "verifying") && <Phone className="h-6 w-6 text-olive-600" />}
          {stage === "done" && <CheckCircle2 className="h-6 w-6 text-olive-600" />}
        </div>
        <h1 className="text-3xl text-ink">
          {stage === "sending" && "Sending your code…"}
          {(stage === "otp" || stage === "verifying") && "Verify your phone"}
          {stage === "done" && "You're all set"}
        </h1>
        <p className="mt-3 text-ink-muted">
          {stage === "sending" && "Payment successful — just a moment."}
          {(stage === "otp" || stage === "verifying") && <>We've sent a 6-digit code to <strong className="text-ink">{phone}</strong>.</>}
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
        </form>
      )}

      {stage === "done" && (
        <div className="rounded-2xl bg-surface border border-border p-8 shadow-soft text-center">
          <p className="text-sm text-ink-muted mb-6">
            Log in any time with <strong className="text-ink">{phone}</strong> — we'll text you a fresh code, no password needed.
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

      <div id="recaptcha-container" />
    </div>
  )
}

export default Account
