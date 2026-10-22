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
      navigate("/subscribe/delivery?declined=1")
      return
    }

    // Worldpay can take a little while to report the result of a payment that has really gone through. The server answers
    // 202 "still confirming" until it knows, so keep asking (up to ~90s) instead of treating the wait as a decline.
    let cancelled = false
    async function confirm(attempt: number) {
      try {
        await api.post("/payments/confirm", { subscriptionId })
        if (!cancelled) navigate("/subscribe/account")
      } catch (err) {
        if (cancelled) return
        console.error(err instanceof ApiError ? err.message : err)
        if (err instanceof ApiError && err.status === 202) {
          if (attempt < 18) setTimeout(() => confirm(attempt + 1), 5000)
          else navigate("/subscribe/delivery?pending=1")
          return
        }
        navigate("/subscribe/delivery?declined=1")
      }
    }
    confirm(0)
    return () => {
      cancelled = true
    }
  }, [searchParams, state.subscriptionId, navigate])

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-8 w-8 rounded-full border-2 border-olive-600 border-t-transparent animate-spin mb-4" />
      <p className="text-ink-muted">Confirming your payment…</p>
      <p className="mt-2 text-sm text-ink-muted">This can take a minute. Please don't pay again or close this page.</p>
    </div>
  )
}

export default PaymentReturn
