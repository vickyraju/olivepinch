import { useEffect, useState } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { CheckCircle2, Lock, XCircle } from "lucide-react"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field-error"
import { Logo } from "@/components/ui/logo"

interface CompleteAccountInfo {
  customerId: string
  email: string
  accountStatus: string
}

function CompleteAccount() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const navigate = useNavigate()
  const { setSession } = useAuth()

  const [status, setStatus] = useState<"loading" | "invalid" | "ready" | "already-active">("loading")
  const [info, setInfo] = useState<CompleteAccountInfo | null>(null)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus("invalid")
      return
    }
    api
      .get<CompleteAccountInfo>(`/auth/complete-account?token=${encodeURIComponent(token)}`)
      .then((data) => {
        setInfo(data)
        setStatus(data.accountStatus === "ACTIVE" ? "already-active" : "ready")
      })
      .catch(() => setStatus("invalid"))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError("Password must be at least 8 characters.")
    if (password !== confirm) return setError("Passwords don't match.")
    setError("")
    setSaving(true)
    try {
      const res = await api.post<{ token: string }>("/auth/password", {
        customerId: info!.customerId,
        password,
        verificationToken: token,
      })
      await setSession(res.token)
      navigate("/dashboard")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "This link has expired — contact support to recover your account.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-cream-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="mb-1 inline-block">
            <Logo className="text-2xl" />
          </Link>
        </div>

        {status === "loading" && <p className="text-center text-sm text-ink-muted">Checking your link…</p>}

        {status === "invalid" && (
          <div className="rounded-lg bg-surface border border-border shadow-soft p-6 text-center">
            <XCircle className="h-8 w-8 text-coral-500 mx-auto mb-3" />
            <p className="font-semibold text-ink mb-1">This link has expired</p>
            <p className="text-sm text-ink-muted">Contact support to recover your account.</p>
          </div>
        )}

        {status === "already-active" && (
          <div className="rounded-lg bg-surface border border-border shadow-soft p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-olive-600 mx-auto mb-3" />
            <p className="font-semibold text-ink mb-1">Your account is already set up</p>
            <Link to="/login" className="text-sm text-olive-600 underline">Log in instead</Link>
          </div>
        )}

        {status === "ready" && info && (
          <form onSubmit={handleSubmit} className="rounded-lg bg-surface border border-border shadow-soft p-6 space-y-4">
            <p className="text-sm text-ink-muted">
              Your payment went through for <strong className="text-ink">{info.email}</strong> — finish setting up your account by creating a password.
            </p>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <FieldError>{error}</FieldError>
            <Button type="submit" variant="accent" className="w-full" disabled={saving}>
              <Lock className="h-4 w-4" />
              {saving ? "Creating account…" : "Create account"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default CompleteAccount
