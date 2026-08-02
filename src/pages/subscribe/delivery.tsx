import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useSubscribe } from "@/lib/subscribe-context"
import { OrderSummary } from "./order-summary"
import { StepNav } from "./step-nav"

function Delivery() {
  const { state, update } = useSubscribe()
  const navigate = useNavigate()
  const [line1, setLine1] = useState("")
  const [line2, setLine2] = useState("")
  const [city, setCity] = useState("")
  const [postcode, setPostcode] = useState(state.postcode)

  const canContinue = !!(line1.trim() && city.trim() && postcode.trim())

  function handleContinue() {
    const address = [line1.trim(), line2.trim(), city.trim(), postcode.trim()].filter(Boolean).join(", ")
    update({ deliveryAddress: address })
    navigate("/subscribe/payment")
  }

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl text-ink mb-2">Delivery details</h1>
      <p className="text-ink-muted mb-8">Where should we drop off your meals?</p>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-soft order-2 lg:order-1 space-y-5">
          <div>
            <Label htmlFor="line1">Address line 1</Label>
            <Input id="line1" autoComplete="address-line1" placeholder="Flat / house number, street" value={line1} onChange={(e) => setLine1(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="line2">Address line 2 <span className="text-ink-muted font-normal">(optional)</span></Label>
            <Input id="line2" autoComplete="address-line2" value={line2} onChange={(e) => setLine2(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">Town or city</Label>
              <Input id="city" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="postcode">Postcode</Label>
              <Input id="postcode" autoComplete="postal-code" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <OrderSummary />
        </div>
      </div>

      <StepNav backTo="/subscribe/account-setup" continueDisabled={!canContinue} onContinue={handleContinue} />
    </div>
  )
}

export default Delivery
