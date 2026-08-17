import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { FieldError } from "@/components/ui/field-error"
import { useSubscribe, type DeliverySlot } from "@/lib/subscribe-context"
import { api } from "@/lib/api"
import { OrderSummary } from "./order-summary"
import { StepNav } from "./step-nav"
import { cn } from "@/lib/utils"

const DELIVERY_SLOTS: { value: DeliverySlot; label: string; hint: string }[] = [
  { value: "Daily", label: "Daily", hint: "A box every day" },
  { value: "Weekly", label: "Weekly", hint: "One box for the whole week" },
  { value: "Alternate days", label: "Alternate days", hint: "A box every other day" },
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

  const canContinue = !!(doorNumber.trim() && street.trim() && area.trim() && postcode.trim())

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
        <div className="rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-soft order-2 lg:order-1 space-y-5">
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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

          <div>
            <Label>Delivery frequency</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DELIVERY_SLOTS.map((d) => {
                const active = state.deliverySlot === d.value
                return (
                  <button
                    key={d.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => update({ deliverySlot: d.value })}
                    className={cn(
                      "rounded-xl border-2 p-4 text-left transition-colors cursor-pointer",
                      active ? "border-olive-600 bg-olive-50" : "border-border bg-surface hover:border-olive-300"
                    )}
                  >
                    <div className="font-semibold text-ink">{d.label}</div>
                    <div className="text-xs text-ink-muted mt-1">{d.hint}</div>
                  </button>
                )
              })}
            </div>
          </div>
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
