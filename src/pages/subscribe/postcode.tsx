import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { MapPin, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FieldError } from "@/components/ui/field-error"
import { useSubscribe } from "@/lib/subscribe-context"
import { formatPostcode } from "@/lib/postcode"
import { api } from "@/lib/api"

function Postcode() {
  const { state, update } = useSubscribe()
  const navigate = useNavigate()
  const [postcode, setPostcode] = useState(state.postcode)
  const [checked, setChecked] = useState<"valid" | "invalid" | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState("")
  const [notifyEmail, setNotifyEmail] = useState("")
  const [notifySent, setNotifySent] = useState(false)

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault()
    if (!postcode.trim()) {
      setError("Enter your postcode to continue.")
      setChecked(null)
      return
    }
    setError("")
    setChecking(true)
    try {
      const res = await api.post<{ valid: boolean; postcode: string }>("/postcode/check", { postcode })
      setChecked(res.valid ? "valid" : "invalid")
      if (res.valid) {
        update({ postcode: formatPostcode(postcode), postcodeConfirmed: true })
        setTimeout(() => navigate("/subscribe/goal"), 3000)
      }
    } catch {
      setError("Couldn't check that postcode — try again.")
    } finally {
      setChecking(false)
    }
  }

  async function handleNotifyMe() {
    try {
      await api.post("/postcode/leads", { email: notifyEmail, postcode: formatPostcode(postcode) })
      setNotifySent(true)
    } catch {
      setNotifySent(true) // Don't block the demo on a non-critical lead-capture failure
    }
  }

  return (
    <div>
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-olive-50">
          <MapPin className="h-6 w-6 text-olive-600" />
        </div>
        <h1 className="text-3xl sm:text-4xl text-ink">Where should we deliver?</h1>
        <p className="mt-3 text-ink-muted">
          We're currently piloting OlivePinch across Birmingham postcodes only.
        </p>
      </div>

      <form onSubmit={handleCheck} className="rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-soft">
        <Label htmlFor="postcode">Postcode</Label>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            id="postcode"
            placeholder="e.g. B15 2TT"
            value={postcode}
            onChange={(e) => {
              setPostcode(e.target.value)
              setChecked(null)
            }}
            aria-invalid={!!error}
            autoComplete="postal-code"
            className="w-full sm:flex-1"
          />
          <Button type="submit" variant="primary" size="md" className="sm:w-auto" disabled={checking}>
            {checking ? "Checking…" : "Check availability"}
          </Button>
        </div>
        <FieldError>{error}</FieldError>

        {checked === "valid" && (
          <div role="status" className="mt-5 flex items-start gap-3 rounded-lg bg-olive-50 p-4">
            <CheckCircle2 className="h-5 w-5 text-olive-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-olive-700">Great news — we deliver to {formatPostcode(postcode)}</p>
              <p className="text-sm text-olive-700/80 mt-0.5">Let's set up your plan.</p>
            </div>
          </div>
        )}

        {checked === "invalid" && (
          <div role="alert" className="mt-5 rounded-lg bg-coral-50 p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-coral-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-coral-600">We don't deliver to {formatPostcode(postcode)} yet</p>
                <p className="text-sm text-ink-muted mt-0.5">
                  We're only piloting in Birmingham right now. Leave your email and we'll let you know the moment we launch in your area.
                </p>
              </div>
            </div>

            {notifySent ? (
              <p className="mt-4 text-sm font-medium text-olive-700">Thanks — we'll email you when we launch in your area.</p>
            ) : (
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  className="w-full sm:flex-1"
                  aria-label="Email for launch notification"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!notifyEmail.includes("@")}
                  onClick={handleNotifyMe}
                >
                  Notify me
                </Button>
              </div>
            )}
          </div>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Already subscribed? <Link to="/login" className="text-olive-600 font-medium underline">Log in</Link>
      </p>
    </div>
  )
}

export default Postcode
