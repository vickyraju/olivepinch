import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { AlertCircle } from "lucide-react"
import { Label, Required } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/ui/phone-input"
import { FieldError } from "@/components/ui/field-error"
import { useSubscribe } from "@/lib/subscribe-context"
import { useDeliveryTimeSlots } from "@/lib/delivery-time-slots"
import { api, ApiError } from "@/lib/api"
import { DELIVERY_SLOT_TO_ENUM, TIER_TO_ENUM } from "@/lib/enum-map"
import { OrderSummary } from "./order-summary"
import { StepNav } from "./step-nav"
import { splitFullName, joinFullName, cn } from "@/lib/utils"

function Delivery() {
  const { state, update } = useSubscribe()
  const deliveryTimeSlots = useDeliveryTimeSlots()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [doorNumber, setDoorNumber] = useState(state.deliveryAddress.doorNumber)
  const [buildingName, setBuildingName] = useState(state.deliveryAddress.buildingName)
  const [street, setStreet] = useState(state.deliveryAddress.street)
  const [area, setArea] = useState(state.deliveryAddress.area || "Birmingham")
  const [postcode, setPostcode] = useState(state.deliveryAddress.postcode || state.postcode)
  const [error, setError] = useState("")
  // Set once the customer tries to pay with something missing: those fields turn red.
  const [showErrors, setShowErrors] = useState(false)
  const [status, setStatus] = useState<"idle" | "checking" | "processing" | "failed">("idle")
  const [declineMessage, setDeclineMessage] = useState("")
  // A ref, not state — state updates are batched, so a fast double-click (or the button's
  // disabled prop not yet having painted) could invoke handlePay a second time while the
  // first is still in flight, creating two separate subscriptions and two Worldpay hosted
  // payment pages for one intended purchase. A ref write is synchronous and visible
  // immediately to the second invocation, closing that window.
  const payingRef = useRef(false)

  // Worldpay redirects back here on a declined/failed/cancelled payment — same failure UI
  // whether it's a real decline or a manual test visit to /subscribe/delivery?declined=1.
  useEffect(() => {
    if (searchParams.get("declined")) {
      setDeclineMessage("Your card issuer declined this payment. Nothing else has changed — check your details and try again.")
      setStatus("failed")
    }
  }, [searchParams])
  // Worldpay has not reported the result yet (see payment-return.tsx): the payment may well have gone through.
  const stillConfirming = !!searchParams.get("pending")

  const p = state.profile
  // Kept as two boxes' own text: re-splitting the joined full name on every keystroke moved a typed
  // space from the end of the first name onto the start of the last name.
  const [names, setNames] = useState(() => splitFullName(p.fullName))
  const { firstName, lastName } = names
  function setName(part: "firstName" | "lastName", value: string) {
    const next = { ...names, [part]: value }
    setNames(next)
    update({ profile: { ...p, fullName: joinFullName(next.firstName.trim(), next.lastName.trim()) } })
  }
  const canContinue = !!(
    firstName.trim() &&
    lastName.trim() &&
    p.phone.trim() &&
    doorNumber.trim() &&
    street.trim() &&
    area.trim() &&
    postcode.trim() &&
    state.deliveryTimeSlot
  )

  async function handlePay() {
    if (payingRef.current) return
    if (!canContinue) {
      setShowErrors(true)
      // Let the red state paint, then bring the first missed field into view.
      setTimeout(() => {
        const first = document.querySelector<HTMLElement>('[aria-invalid="true"]')
        first?.scrollIntoView({ block: "center", behavior: "smooth" })
        first?.focus({ preventScroll: true })
      }, 50)
      return
    }
    payingRef.current = true
    setError("")
    setDeclineMessage("")
    setStatus("checking")
    try {
      const res = await api.post<{ valid: boolean; postcode: string }>("/postcode/check", { postcode })
      if (!res.valid) {
        setError("We don't currently deliver to that postcode — we're Birmingham-only for now.")
        setStatus("idle")
        return
      }
      const deliveryAddress = {
        doorNumber: doorNumber.trim(),
        buildingName: buildingName.trim(),
        street: street.trim(),
        area: area.trim(),
        postcode: res.postcode,
      }
      update({ deliveryAddress })

      // customerId/signupToken are created in the account-setup step (email or Google
      // sign-in) that runs before this one — if either is missing, the funnel was entered
      // out of order (e.g. a stale back-button visit) and needs to restart from there.
      const customerId = state.customerId
      const signupToken = state.signupToken
      if (!customerId || !signupToken) {
        navigate("/subscribe/account-setup")
        return
      }

      setStatus("processing")

      const subscription = await api.post<{ subscriptionId: string }>(
        "/subscriptions",
        {
          customerId,
          planDuration: state.planDuration,
          startDate: state.startDate,
          mealsPerDay: state.mealsPerDay,
          tier: TIER_TO_ENUM[state.tier ?? "Basic"],
          email: p.email.trim(),
          addressDoorNumber: deliveryAddress.doorNumber,
          addressBuildingName: deliveryAddress.buildingName || undefined,
          addressStreet: deliveryAddress.street,
          addressArea: deliveryAddress.area,
          addressPostcode: deliveryAddress.postcode,
          deliverySlot: DELIVERY_SLOT_TO_ENUM["Daily"],
          deliveryTimeSlot: state.deliveryTimeSlot!,
          dayMenus: state.dayMenus,
          promoCode: state.promoCode ?? undefined,
        },
        { Authorization: `Bearer ${signupToken}` }
      )
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
      setDeclineMessage(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Something went wrong processing your payment — please try again.")
      setStatus("failed")
      payingRef.current = false
    }
  }

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl text-ink mb-2">Delivery details</h1>
      <p className="text-ink-muted mb-8">Where should we drop off your meals?</p>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-soft lg:order-1">
          <section className="space-y-5">
            <div>
              <h2 className="text-lg text-ink mb-1">Your details</h2>
              <p className="text-sm text-ink-muted">Spot a typo? You can still fix it here.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First name <Required /></Label>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  aria-invalid={showErrors && !firstName.trim()}
                  value={firstName}
                  onChange={(e) => setName("firstName", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last name <Required /></Label>
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  aria-invalid={showErrors && !lastName.trim()}
                  value={lastName}
                  onChange={(e) => setName("lastName", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="phone">Phone number <Required /></Label>
              <PhoneInput
                id="phone"
                invalid={showErrors && !p.phone.trim()}
                value={p.phone}
                onChange={(v) => update({ profile: { ...p, phone: v } })}
              />
            </div>
          </section>

          <section className="space-y-5 mt-8 pt-8 border-t border-border">
            <h2 className="text-lg text-ink">Delivery address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="doorNumber">Door number <Required /></Label>
                <Input id="doorNumber" autoComplete="address-line1" placeholder="e.g. 12" aria-invalid={showErrors && !doorNumber.trim()} value={doorNumber} onChange={(e) => setDoorNumber(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="buildingName">Building name <span className="text-ink-muted font-normal">(optional)</span></Label>
                <Input id="buildingName" autoComplete="address-line2" value={buildingName} onChange={(e) => setBuildingName(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="street">Street <Required /></Label>
              <Input id="street" autoComplete="address-line1" aria-invalid={showErrors && !street.trim()} value={street} onChange={(e) => setStreet(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="area">Area <Required /></Label>
                <Input id="area" autoComplete="address-level2" aria-invalid={showErrors && !area.trim()} value={area} onChange={(e) => setArea(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="postcode">Postcode <Required /></Label>
                <Input
                  id="postcode"
                  autoComplete="postal-code"
                  value={postcode}
                  onChange={(e) => {
                    setPostcode(e.target.value)
                    setError("")
                  }}
                  aria-invalid={!!error || (showErrors && !postcode.trim())}
                />
              </div>
            </div>
            <FieldError>{error}</FieldError>
          </section>

          <section className="space-y-3 mt-8 pt-8 border-t border-border">
            <div>
              <h2 className="text-lg text-ink">Delivery time slot</h2>
              <p className="text-sm text-ink-muted">When should we drop your meals off each day?</p>
            </div>
            <div aria-invalid={showErrors && !state.deliveryTimeSlot} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 rounded-xl aria-[invalid=true]:bg-coral-50 aria-[invalid=true]:p-2 aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-destructive">
              {deliveryTimeSlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  aria-pressed={state.deliveryTimeSlot === slot.label}
                  onClick={() => update({ deliveryTimeSlot: slot.label })}
                  className={cn(
                    "rounded-lg border-2 py-2.5 text-sm font-semibold transition-colors cursor-pointer",
                    state.deliveryTimeSlot === slot.label ? "border-olive-600 bg-olive-50 text-olive-700" : "border-border text-ink hover:border-olive-300"
                  )}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </section>

          {stillConfirming && status !== "failed" && (
            <div className="mt-8 pt-8 border-t border-border">
              <div role="status" className="rounded-lg bg-olive-50 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-olive-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-olive-700">We're still confirming your payment</p>
                  <p className="text-sm text-ink-muted mt-0.5">
                    If your card was charged, your plan will be set up automatically and we'll email you. Please don't pay again. If you
                    haven't heard from us within an hour, contact hello@olivepinch.com.
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === "failed" && (
            <div className="mt-8 pt-8 border-t border-border">
              <div role="alert" className="rounded-lg bg-coral-50 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-coral-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-coral-600">Payment declined</p>
                  <p className="text-sm text-ink-muted mt-0.5">{declineMessage}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:order-2">
          <OrderSummary
            onPay={handlePay}
            payDisabled={status === "checking" || status === "processing"}
            payLabel={status === "checking" ? "Checking postcode…" : status === "processing" ? "Processing…" : "Continue to Payment"}
          />
        </div>
      </div>

      <StepNav backTo="/subscribe/profile" hideContinue />
    </div>
  )
}

export default Delivery
