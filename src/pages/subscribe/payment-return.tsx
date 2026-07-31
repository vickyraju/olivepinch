import { useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useSubscribe } from "@/lib/subscribe-context"
import { api, ApiError } from "@/lib/api"

// Worldpay redirects the customer's browser back here after they finish (or abandon)
// payment on the hosted page — every outcome (success/failure/cancel/error/pending/
// expiry) uses this same URL. The real outcome is always resolved server-side via
// /payments/confirm, never trusted from which redirect URL Worldpay happened to use.
function PaymentReturn() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { state } = useSubscribe()
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    const subscriptionId = searchParams.get("subscriptionId") ?? state.subscriptionId
    if (!subscriptionId) {
      navigate("/subscribe/payment?declined=1")
      return
    }

    api
      .post("/payments/confirm", { subscriptionId })
      .then(() => navigate("/subscribe/account"))
      .catch((err) => {
        console.error(err instanceof ApiError ? err.message : err)
        navigate("/subscribe/payment?declined=1")
      })
  }, [searchParams, state.subscriptionId, navigate])

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-8 w-8 rounded-full border-2 border-olive-600 border-t-transparent animate-spin mb-4" />
      <p className="text-ink-muted">Confirming your payment…</p>
    </div>
  )
}

export default PaymentReturn
