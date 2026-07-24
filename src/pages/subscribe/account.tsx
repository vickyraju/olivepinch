import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle2, Mail, Lock, Eye, EyeOff } from "lucide-react"
import { useSubscribe } from "@/lib/subscribe-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field-error"

const DEMO_OTP = "123456"

function Account() {
  const { state } = useSubscribe()
  const navigate = useNavigate()
  const email = state.profile.email || "your email"

  const [stage, setStage] = useState<"otp" | "password" | "done">("otp")
  const [otp, setOtp] = useState("")
  const [otpError, setOtpError] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [pwError, setPwError] = useState("")

  function verifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (otp !== DEMO_OTP) {
      setOtpError("That code isn't right. For this demo, use 123456.")
      return
    }
    setOtpError("")
    setStage("password")
  }

  function createPassword(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setPwError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setPwError("Passwords don't match.")
      return
    }
    setPwError("")
    setStage("done")
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-olive-50">
          {stage === "otp" && <Mail className="h-6 w-6 text-olive-600" />}
          {stage === "password" && <Lock className="h-6 w-6 text-olive-600" />}
          {stage === "done" && <CheckCircle2 className="h-6 w-6 text-olive-600" />}
        </div>
        <h1 className="text-3xl text-ink">
          {stage === "otp" && "Verify your email"}
          {stage === "password" && "Create a password"}
          {stage === "done" && "You're all set"}
        </h1>
        <p className="mt-3 text-ink-muted">
          {stage === "otp" && <>Payment successful. We've sent a 6-digit code to <strong className="text-ink">{email}</strong>.</>}
          {stage === "password" && "Set a password so you can log in with your email next time."}
          {stage === "done" && "Your OlivePinch account and subscription are ready."}
        </p>
      </div>

      {stage === "otp" && (
        <form onSubmit={verifyOtp} className="rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-soft">
          <Label htmlFor="otp">6-digit code</Label>
          <Input
            id="otp"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            className="tracking-[0.5em] text-center text-lg"
          />
          <FieldError>{otpError}</FieldError>
          <p className="mt-2 text-xs text-ink-muted">Demo hint: the code is 123456.</p>
          <Button type="submit" variant="accent" size="lg" className="w-full mt-5">
            Verify code
          </Button>
        </form>
      )}

      {stage === "password" && (
        <form onSubmit={createPassword} className="rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-soft space-y-5">
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-0 top-0 h-12 w-11 flex items-center justify-center text-ink-muted cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <FieldError>{pwError}</FieldError>
          <Button type="submit" variant="accent" size="lg" className="w-full">
            Create account
          </Button>
        </form>
      )}

      {stage === "done" && (
        <div className="rounded-2xl bg-surface border border-border p-8 shadow-soft text-center">
          <p className="text-sm text-ink-muted mb-6">
            Log in any time with <strong className="text-ink">{email}</strong> and your new password.
          </p>
          <Button variant="accent" size="lg" className="w-full" onClick={() => navigate("/dashboard")}>
            Go to your dashboard
          </Button>
        </div>
      )}
    </div>
  )
}

export default Account
