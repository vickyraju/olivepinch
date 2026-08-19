import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Package, CalendarDays, Repeat } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { FieldError } from "@/components/ui/field-error"
import { useSubscribe, type DeliverySlot } from "@/lib/subscribe-context"
import { api } from "@/lib/api"
import { OrderSummary } from "./order-summary"
import { StepNav } from "./step-nav"
import { cn } from "@/lib/utils"

const DELIVERY_SLOTS: { value: DeliverySlot; label: string; hint: string; icon: typeof Package }[] = [
  { value: "Daily", label: "Daily", hint: "A box every day", icon: Package },
  { value: "Weekly", label: "Weekly", hint: "One box, once a week", icon: CalendarDays },
  { value: "Alternate days", label: "Alternate days", hint: "A box every other day", icon: Repeat },
]

function Delivery() {
  const { state, update } = useSubscribe()
  const navigate = useNavigate()
  const [doorNumber, setDoorNumber] = useState(state.deliveryAddress.doorNumber)
  const [buildingName, setBuildingName] = useState(state.deliveryAddress.buildingName)
  const [street, setStreet] = useState(state.deliveryAddress.street)
  const [area, setArea] = useState(state.deliveryAddress.area || "Birmingham")
  const [postcode, setPostcode] = useState(state.deliveryAddress.postcode || state.postcode)
  const [error, setError] = useState("")
  const [checking, setChecking] = useState(false)

  const p = state.profile
  const canContinue = !!(
    p.fullName.trim() &&
    p.phone.trim() &&
    doorNumber.trim() &&
    street.trim() &&
    area.trim() &&
    postcode.trim()
  )

  async function handleContinue() {
    setError("")
    setChecking(true)
    try {
      const res = await api.post<{ valid: boolean; postcode: string }>("/postcode/check", { postcode })
      if (!res.valid) {
        setError("We don't currently deliver to that postcode — we're only piloting in Birmingham right now.")
        setChecking(false)
        return
      }
      update({
        deliveryAddress: {
          doorNumber: doorNumber.trim(),
          buildingName: buildingName.trim(),
          street: street.trim(),
          area: area.trim(),
          postcode: res.postcode,
        },
      })
      navigate("/subscribe/payment")
    } catch {
      setError("Couldn't check that postcode — try again.")
      setChecking(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl text-ink mb-2">Delivery details</h1>
      <p className="text-ink-muted mb-8">Where should we drop off your meals?</p>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-soft order-2 lg:order-1">
          <section className="space-y-5">
            <div>
              <h2 className="text-lg text-ink mb-1">Your details</h2>
              <p className="text-sm text-ink-muted">Spot a typo? You can still fix it here.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  autoComplete="name"
                  value={p.fullName}
                  onChange={(e) => update({ profile: { ...p, fullName: e.target.value } })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={p.phone}
                  onChange={(e) => update({ profile: { ...p, phone: e.target.value } })}
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

          <section className="space-y-5 mt-8 pt-8 border-t border-border">
            <h2 className="text-lg text-ink">Delivery frequency</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DELIVERY_SLOTS.map((d) => {
                const active = state.deliverySlot === d.value
                const Icon = d.icon
                return (
                  <button
                    key={d.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => update({ deliverySlot: d.value })}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors cursor-pointer min-h-23",
                      active ? "border-olive-600 bg-olive-50" : "border-border bg-surface hover:border-olive-300"
                    )}
                  >
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", active ? "bg-olive-600" : "bg-cream-100")}>
                      <Icon className={cn("h-4.5 w-4.5", active ? "text-white" : "text-olive-600")} strokeWidth={1.75} />
                    </div>
                    <div>
                      <div className="font-semibold text-ink text-sm">{d.label}</div>
                      <div className="text-xs text-ink-muted mt-0.5">{d.hint}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        <div className="order-1 lg:order-2">
          <OrderSummary />
        </div>
      </div>

      <StepNav
        backTo="/subscribe/account-setup"
        continueDisabled={!canContinue || checking}
        continueLabel={checking ? "Checking…" : "Continue"}
        onContinue={handleContinue}
      />
    </div>
  )
}

export default Delivery
