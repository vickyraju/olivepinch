import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { AlertCircle, ArrowLeft, Lock, ShieldCheck } from "lucide-react"
import { useSubscribe } from "@/lib/subscribe-context"
import { priceForDayMenus, formatGBP } from "@/lib/pricing"
import { api, ApiError } from "@/lib/api"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field-error"

function Payment() {
  const { state, update } = useSubscribe()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [address, setAddress] = useState(state.deliveryAddress)
  const [status, setStatus] = useState<"idle" | "processing" | "failed">("idle")
  const [error, setError] = useState("")
  const [declineMessage, setDeclineMessage] = useState("")

  const total = priceForDayMenus(state.dayMenus)

  // Worldpay redirects back here on a declined/failed/cancelled payment — same failure UI
  // whether it's a real decline or a manual test visit to /subscribe/payment?declined=1.
  useEffect(() => {
    if (searchParams.get("declined")) {
      setDeclineMessage("Your card issuer declined this payment. Nothing else has changed — check your details and try again.")
      setStatus("failed")
    }
  }, [searchParams])

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!address.trim()) {
      setError("Enter your delivery address.")
      return
    }
    setError("")
    update({ deliveryAddress: address, paymentAttempted: true })
    setStatus("processing")

    try {
      if (!state.customerId) throw new Error("Missing your profile — go back and complete the earlier steps.")

      const subscription = await api.post<{ subscriptionId: string }>("/subscriptions", {
        customerId: state.customerId,
        planDuration: state.planDuration,
        startDate: state.startDate,
        mealsPerDay: state.mealsPerDay,
        address,
        dayMenus: state.dayMenus,
      })
      update({ subscriptionId: subscription.subscriptionId })

      const intent = await api.post<{ devMode?: boolean; redirectUrl?: string }>("/payments/intent", {
        subscriptionId: subscription.subscriptionId,
      })

      if (intent.devMode) {
        await api.post("/payments/confirm", { subscriptionId: subscription.subscriptionId })
        navigate("/subscribe/account")
        return
      }

      // Leaves the site — Worldpay's hosted page collects card details, then redirects
      // back to /subscribe/payment/return, which resolves the outcome server-side.
      window.location.href = intent.redirectUrl!
    } catch (err) {
      setDeclineMessage(err instanceof ApiError ? err.message : "Something went wrong processing your payment — please try again.")
      setStatus("failed")
    }
  }

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl text-ink mb-2">Review &amp; pay</h1>
      <p className="text-ink-muted mb-8">Your selections are saved — a failed payment won't cost you any progress.</p>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handlePay} className="rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-soft space-y-5 order-2 lg:order-1">
          <div>
            <Label htmlFor="address">Delivery address</Label>
            <textarea
              id="address"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Flat / house number, street, Birmingham, postcode"
              className="flex w-full rounded-md border border-border bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:border-olive-500"
            />
            <FieldError>{error}</FieldError>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-olive-50 p-4">
            <ShieldCheck className="h-5 w-5 text-olive-600 shrink-0 mt-0.5" />
            <p className="text-sm text-ink-muted">
              You'll be redirected to Worldpay's secure payment page to enter your card details — we never see or store your card number.
            </p>
          </div>

          {status === "failed" && (
            <div role="alert" className="rounded-lg bg-coral-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-coral-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-coral-600">Payment declined</p>
                <p className="text-sm text-ink-muted mt-0.5">{declineMessage}</p>
              </div>
            </div>
          )}

          <Button type="submit" variant="accent" size="lg" className="w-full" disabled={status === "processing"}>
            <Lock className="h-4 w-4" />
            {status === "processing" ? "Processing…" : `Continue to secure payment · ${formatGBP(total)}`}
          </Button>
        </form>

        <div className="order-1 lg:order-2">
          <div className="rounded-2xl bg-surface border border-border p-6 shadow-soft sticky top-24">
            <h2 className="text-lg text-ink mb-4">Order summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-muted">Plan length</dt><dd className="text-ink font-medium">{state.planDuration} days</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">Meals/day</dt><dd className="text-ink font-medium">{state.mealsPerDay}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">Goal</dt><dd className="text-ink font-medium">{state.goal}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">Diet</dt><dd className="text-ink font-medium">{state.dietType}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">Start date</dt><dd className="text-ink font-medium">{state.startDate ? new Date(state.startDate).toLocaleDateString("en-GB") : "—"}</dd></div>
            </dl>
            <div className="border-t border-border mt-4 pt-4 flex justify-between items-baseline">
              <span className="text-ink font-semibold">Total</span>
              <span className="font-display text-2xl font-bold text-ink">{formatGBP(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <Button type="button" variant="ghost" onClick={() => navigate("/subscribe/account-setup")} disabled={status === "processing"}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>
    </div>
  )
}

export default Payment
