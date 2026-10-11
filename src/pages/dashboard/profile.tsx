import { useState } from "react"
import { Link } from "react-router-dom"
import { Activity, Truck, RefreshCw, ArrowRight, ShieldCheck, MapPin } from "lucide-react"
import { useDashboard } from "@/lib/dashboard-context"
import type { DeliveryAddress } from "@/lib/subscribe-context"
import { formatAddress } from "@/lib/address"
import { calculateAge } from "@/lib/subscription"
import { formatPhone } from "@/lib/utils"
import { api } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/ui/phone-input"
import { Label } from "@/components/ui/label"
import { FieldError } from "@/components/ui/field-error"

const LINKS = [
  { to: "/dashboard/health", label: "Health Tracker", desc: "Log weight and body measurements", icon: Activity },
  { to: "/dashboard/delivery", label: "Meal Delivery", desc: "Today's status, pause or resume days, see upcoming meals", icon: Truck },
  { to: "/dashboard/subscription", label: "Subscription", desc: "Renew, change plan length", icon: RefreshCw },
]

function Profile() {
  const { customer, endDate, updateAddress } = useDashboard()
  const sub = customer.subscription
  const [editingAddress, setEditingAddress] = useState(false)
  const [addressInput, setAddressInput] = useState<DeliveryAddress>(customer.address)
  const [phoneInput, setPhoneInput] = useState(customer.phone)
  const [savingAddress, setSavingAddress] = useState(false)
  const [addressError, setAddressError] = useState("")

  const canSaveAddress = !!(
    phoneInput.trim() && addressInput.doorNumber.trim() && addressInput.street.trim() && addressInput.area.trim() && addressInput.postcode.trim()
  )

  async function handleSaveAddress() {
    if (!canSaveAddress) return
    setSavingAddress(true)
    setAddressError("")
    try {
      const check = await api.post<{ valid: boolean; postcode: string }>("/postcode/check", { postcode: addressInput.postcode })
      if (!check.valid) {
        setAddressError("We don't currently deliver to that postcode — we're Birmingham-only for now.")
        setSavingAddress(false)
        return
      }
      const cleaned: DeliveryAddress = { ...addressInput, postcode: check.postcode }
      const result = await updateAddress(cleaned, phoneInput.trim())
      if (result.ok) {
        setEditingAddress(false)
      } else {
        setAddressError(result.reason ?? "Couldn't save your address — try again.")
      }
    } catch {
      setAddressError("Couldn't check that postcode — try again.")
    } finally {
      setSavingAddress(false)
    }
  }

  function cancelEditingAddress() {
    setAddressInput(customer.address)
    setPhoneInput(customer.phone)
    setEditingAddress(false)
    setAddressError("")
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl text-ink mb-1">Hi, {customer.name.split(" ")[0]}</h1>
        <p className="text-ink-muted">Your OlivePinch account hub.</p>
      </div>

      <Card className="p-6 sm:p-8">
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <dt className="text-xs font-medium text-ink-muted uppercase tracking-wide">Full name</dt>
            <dd className="mt-1 text-lg text-ink">{customer.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-muted uppercase tracking-wide">Age</dt>
            <dd className="mt-1 text-lg text-ink">{customer.dateOfBirth ? calculateAge(customer.dateOfBirth) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-muted uppercase tracking-wide">Email</dt>
            <dd className="mt-1 text-lg text-ink">{customer.email}</dd>
          </div>
        </dl>
      </Card>

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg text-ink mb-4">Your plan</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <dt className="text-xs font-medium text-ink-muted uppercase tracking-wide">Plan length</dt>
            <dd className="mt-1 text-ink">{sub.planDuration} days</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-muted uppercase tracking-wide">Goal</dt>
            <dd className="mt-1 text-ink">{sub.goal}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-muted uppercase tracking-wide">Preferred food</dt>
            <dd className="mt-1 text-ink">{sub.dietTypes.join(", ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-muted uppercase tracking-wide">Meals/day</dt>
            <dd className="mt-1 text-ink">{sub.mealsPerDay}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-muted uppercase tracking-wide">Allergens</dt>
            <dd className="mt-1 text-ink">{sub.allergens.length ? sub.allergens.join(", ") : "None"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-muted uppercase tracking-wide">Start date</dt>
            <dd className="mt-1 text-ink">{new Date(sub.startDate).toLocaleDateString("en-GB")}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-muted uppercase tracking-wide">End date</dt>
            <dd className="mt-1 text-ink">{new Date(endDate).toLocaleDateString("en-GB")}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-muted uppercase tracking-wide">Delivery</dt>
            <dd className="mt-1 text-ink">{sub.deliverySlot}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-muted uppercase tracking-wide">Delivery time</dt>
            <dd className="mt-1 text-ink">{sub.deliveryTimeSlot}</dd>
          </div>
        </dl>
      </Card>

      <Card className="p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="text-lg text-ink flex items-center gap-2">
            <MapPin className="h-4.5 w-4.5 text-olive-600" /> Contact &amp; delivery address
          </h2>
          {!editingAddress && (
            <Button type="button" variant="outline" size="sm" onClick={() => setEditingAddress(true)}>
              Change
            </Button>
          )}
        </div>
        {!editingAddress ? (
          <div className="mt-2 space-y-1">
            <p className="text-ink">{customer.phone ? formatPhone(customer.phone) : "No phone number on file"}</p>
            <p className="text-ink">{formatAddress(customer.address) || "No address on file"}</p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div>
              <Label htmlFor="phone">Phone number</Label>
              <PhoneInput
                id="phone"
                value={phoneInput}
                onChange={setPhoneInput}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="doorNumber">Door number</Label>
                <Input
                  id="doorNumber"
                  value={addressInput.doorNumber}
                  onChange={(e) => setAddressInput((a) => ({ ...a, doorNumber: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="buildingName">Building name <span className="text-ink-muted font-normal">(optional)</span></Label>
                <Input
                  id="buildingName"
                  value={addressInput.buildingName}
                  onChange={(e) => setAddressInput((a) => ({ ...a, buildingName: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="street">Street</Label>
              <Input
                id="street"
                value={addressInput.street}
                onChange={(e) => setAddressInput((a) => ({ ...a, street: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="area">Area</Label>
                <Input
                  id="area"
                  value={addressInput.area}
                  onChange={(e) => setAddressInput((a) => ({ ...a, area: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  value={addressInput.postcode}
                  onChange={(e) => {
                    setAddressInput((a) => ({ ...a, postcode: e.target.value }))
                    setAddressError("")
                  }}
                  aria-invalid={!!addressError}
                />
              </div>
            </div>
            <FieldError>{addressError}</FieldError>
            <div className="flex gap-2">
              <Button type="button" variant="primary" size="sm" disabled={savingAddress || !canSaveAddress} onClick={handleSaveAddress}>
                {savingAddress ? "Saving…" : "Save"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={cancelEditingAddress} disabled={savingAddress}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div>
        <h2 className="text-lg text-ink mb-3">Manage your account</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {LINKS.map((link) => (
            <Link key={link.label} to={link.to} className="group">
              <Card className="p-5 flex items-center gap-4 h-full hover:border-olive-300 transition-colors">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-olive-50">
                  <link.icon className="h-5 w-5 text-olive-600" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink">{link.label}</div>
                  <div className="text-sm text-ink-muted">{link.desc}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-ink-muted group-hover:text-olive-600 shrink-0" />
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Link
        to="/dashboard/privacy"
        className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink"
      >
        <ShieldCheck className="h-4 w-4" /> Privacy &amp; data settings
      </Link>
    </div>
  )
}

export default Profile
