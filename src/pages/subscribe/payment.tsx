import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { AlertCircle, ArrowLeft, Lock, ShieldCheck } from "lucide-react"
import { useSubscribe } from "@/lib/subscribe-context"
import { priceForDayMenus, formatGBP } from "@/lib/pricing"
import { api, ApiError } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { OrderSummary } from "./order-summary"

function Payment() {
  const { state, update } = useSubscribe()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<"idle" | "processing" | "failed">("idle")
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

  // Delivery address is collected on the previous step — a direct/stale visit here without it
  // has nothing to submit, so send them back rather than letting a blank address reach the API.
  useEffect(() => {
    if (!state.deliveryAddress) navigate("/subscribe/delivery", { replace: true })
  }, [state.deliveryAddress, navigate])

  async function handlePay() {
    setStatus("processing")
    update({ paymentAttempted: true })

    try {
      if (!state.customerId) throw new Error("Missing your profile — go back and complete the earlier steps.")

      const subscription = await api.post<{ subscriptionId: string }>("/subscriptions", {
        customerId: state.customerId,
        planDuration: state.planDuration,
        startDate: state.startDate,
        mealsPerDay: state.mealsPerDay,
        address: state.deliveryAddress,
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
        <div className="rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-soft space-y-5 order-2 lg:order-1">
          <div>
            <p className="text-sm font-medium text-ink mb-1">Delivering to</p>
            <p className="text-sm text-ink-muted">{state.deliveryAddress}</p>
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

          <Button type="button" variant="accent" size="lg" className="w-full" disabled={status === "processing"} onClick={handlePay}>
            <Lock className="h-4 w-4" />
            {status === "processing" ? "Processing…" : `Continue to secure payment · ${formatGBP(total)}`}
          </Button>
        </div>

        <div className="order-1 lg:order-2">
          <OrderSummary />
        </div>
      </div>

      <div className="mt-10">
        <Button type="button" variant="ghost" onClick={() => navigate("/subscribe/delivery")} disabled={status === "processing"}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>
    </div>
  )
}

export default Payment
