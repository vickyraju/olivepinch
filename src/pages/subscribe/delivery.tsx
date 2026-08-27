import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { AlertCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/ui/phone-input"
import { FieldError } from "@/components/ui/field-error"
import { useSubscribe } from "@/lib/subscribe-context"
import { api, ApiError } from "@/lib/api"
import { DELIVERY_SLOT_TO_ENUM, TIER_TO_ENUM, GOAL_TO_ENUM, DIET_TO_ENUM } from "@/lib/enum-map"
import { OrderSummary } from "./order-summary"
import { StepNav } from "./step-nav"
import { splitFullName, joinFullName } from "@/lib/utils"

function Delivery() {
  const { state, update } = useSubscribe()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [doorNumber, setDoorNumber] = useState(state.deliveryAddress.doorNumber)
  const [buildingName, setBuildingName] = useState(state.deliveryAddress.buildingName)
  const [street, setStreet] = useState(state.deliveryAddress.street)
  const [area, setArea] = useState(state.deliveryAddress.area || "Birmingham")
  const [postcode, setPostcode] = useState(state.deliveryAddress.postcode || state.postcode)
  const [error, setError] = useState("")
  const [status, setStatus] = useState<"idle" | "checking" | "processing" | "failed">("idle")
  const [declineMessage, setDeclineMessage] = useState("")

  // Worldpay redirects back here on a declined/failed/cancelled payment — same failure UI
  // whether it's a real decline or a manual test visit to /subscribe/delivery?declined=1.
  useEffect(() => {
    if (searchParams.get("declined")) {
      setDeclineMessage("Your card issuer declined this payment. Nothing else has changed — check your details and try again.")
      setStatus("failed")
    }
  }, [searchParams])

  const p = state.profile
  const { firstName, lastName } = splitFullName(p.fullName)
  const canContinue = !!(
    firstName.trim() &&
    lastName.trim() &&
    p.phone.trim() &&
    /\S+@\S+\.\S+/.test(p.email) &&
    doorNumber.trim() &&
    street.trim() &&
    area.trim() &&
    postcode.trim()
  )

  async function handlePay() {
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

      setStatus("processing")
      let customerId = state.customerId
      if (!customerId) {
        if (!state.goal || state.dietTypes.length === 0) throw new Error("Missing your goal and diet preferences — go back and complete the earlier steps.")
        const provisional = await api.post<{ customerId: string }>("/customers/provisional", {
          fullName: p.fullName.trim(),
          phone: p.phone.trim(),
          gender: p.gender || undefined,
          dateOfBirth: p.dateOfBirth,
          heightCm: Number(p.heightCm),
          weightKg: Number(p.weightKg),
          healthConsent: true,
          marketingOptIn: false,
        })
        // Goal/diet/allergens were picked several steps ago in "Choose" but couldn't be saved
        // until now — that PATCH is customer-scoped, and this is the first point a customerId exists.
        await api.patch(`/customers/${provisional.customerId}/preferences`, {
          goal: GOAL_TO_ENUM[state.goal],
          dietTypes: state.dietTypes.map((d) => DIET_TO_ENUM[d]),
          allergens: state.allergens,
          postcode: state.postcode,
        })
        customerId = provisional.customerId
        update({ customerId })
      }

      const subscription = await api.post<{ subscriptionId: string }>("/subscriptions", {
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
        dayMenus: state.dayMenus,
        promoCode: state.promoCode ?? undefined,
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
      setDeclineMessage(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Something went wrong processing your payment — please try again.")
      setStatus("failed")
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
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => update({ profile: { ...p, fullName: joinFullName(e.target.value, lastName) } })}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => update({ profile: { ...p, fullName: joinFullName(firstName, e.target.value) } })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone number</Label>
                <PhoneInput
                  id="phone"
                  value={p.phone}
                  onChange={(v) => update({ profile: { ...p, phone: v } })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={p.email}
                  onChange={(e) => update({ profile: { ...p, email: e.target.value } })}
                />
              </div>
            </div>
          </section>

          <section className="space-y-5 mt-8 pt-8 border-t border-border">
            <h2 className="text-lg text-ink">Delivery address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="doorNumber">Door number</Label>
                <Input id="doorNumber" autoComplete="address-line1" placeholder="e.g. 12" value={doorNumber} onChange={(e) => setDoorNumber(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="buildingName">Building name <span className="text-ink-muted font-normal">(optional)</span></Label>
                <Input id="buildingName" autoComplete="address-line2" value={buildingName} onChange={(e) => setBuildingName(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="street">Street</Label>
              <Input id="street" autoComplete="address-line1" value={street} onChange={(e) => setStreet(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="area">Area</Label>
                <Input id="area" autoComplete="address-level2" value={area} onChange={(e) => setArea(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  autoComplete="postal-code"
                  value={postcode}
                  onChange={(e) => {
                    setPostcode(e.target.value)
                    setError("")
                  }}
                  aria-invalid={!!error}
                />
              </div>
            </div>
            <FieldError>{error}</FieldError>
          </section>

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
            payDisabled={!canContinue || status === "checking" || status === "processing"}
            payLabel={status === "checking" ? "Checking postcode…" : status === "processing" ? "Processing…" : "Continue to Payment"}
          />
        </div>
      </div>

      <StepNav backTo="/subscribe/profile" hideContinue />
    </div>
  )
}

export default Delivery
