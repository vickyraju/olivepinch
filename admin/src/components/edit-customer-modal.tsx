import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api, ApiError } from "@/lib/api"
import { DIET_LABELS, GENDER_OPTIONS, GOAL_LABELS } from "@/lib/customer-labels"

export interface EditableCustomer {
  id: string
  fullName: string
  email: string
  phone: string | null
  gender: string | null
  dateOfBirth: string | null
  heightCm: number | null
  weightKg: number | null
  goal: string | null
  dietTypes: string[]
  allergens: string[]
  addressDoorNumber: string | null
  addressBuildingName: string | null
  addressStreet: string | null
  addressArea: string | null
  addressPostcode: string | null
  marketingOptIn: boolean
  accountStatus: string
}

interface Allergen {
  id: string
  name: string
  active: boolean
}

export interface EditResult {
  changed: string[]
  emailChanged?: boolean
}

const FIELD_LABELS: Record<string, string> = {
  fullName: "Full name",
  email: "Email",
  phone: "Phone",
  gender: "Gender",
  dateOfBirth: "Date of birth",
  heightCm: "Height",
  weightKg: "Weight",
  goal: "Style",
  dietTypes: "Food types",
  allergens: "Allergens",
  addressDoorNumber: "Door number",
  addressBuildingName: "Building name",
  addressStreet: "Street",
  addressArea: "Area",
  addressPostcode: "Postcode",
  marketingOptIn: "Marketing emails",
  accountStatus: "Account status",
}

const inputClass = "w-full h-10 border border-gray-200 rounded-lg px-3 text-sm outline-none focus:border-primary"
const labelClass = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1"

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[13px] font-bold text-gray-900 mb-3">{title}</h4>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

export function EditCustomerModal({
  customer,
  onClose,
  onSaved,
}: {
  customer: EditableCustomer
  onClose: () => void
  onSaved: (result: EditResult) => void | Promise<void>
}) {
  const initial = {
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone ?? "",
    gender: customer.gender ?? "",
    dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.slice(0, 10) : "",
    heightCm: customer.heightCm === null ? "" : String(customer.heightCm),
    weightKg: customer.weightKg === null ? "" : String(customer.weightKg),
    goal: customer.goal ?? "",
    dietTypes: customer.dietTypes,
    allergens: customer.allergens,
    addressDoorNumber: customer.addressDoorNumber ?? "",
    addressBuildingName: customer.addressBuildingName ?? "",
    addressStreet: customer.addressStreet ?? "",
    addressArea: customer.addressArea ?? "",
    addressPostcode: customer.addressPostcode ?? "",
    marketingOptIn: customer.marketingOptIn,
    accountStatus: customer.accountStatus,
  }
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  // Fields the save was refused on (by the client check or the server): they turn red until edited.
  const [badFields, setBadFields] = useState<string[]>([])
  const bad = (key: string) => badFields.includes(key)

  const allergenQuery = useQuery({ queryKey: ["allergens"], queryFn: () => api.get<Allergen[]>("/allergens") })
  // The configured allergens, plus anything this customer already has that isn't on the list any more,
  // so saving never silently drops an allergy.
  const allergenOptions = [
    ...new Set([...(allergenQuery.data ?? []).filter((a) => a.active).map((a) => a.name), ...customer.allergens]),
  ]

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setBadFields((b) => b.filter((k) => k !== key))
    setForm((f) => ({ ...f, [key]: value }))
  }
  const toggle = (key: "dietTypes" | "allergens", value: string) =>
    setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }))

  // Only fields that differ are sent, so an edit to one detail can't overwrite another from stale data.
  function buildChanges(): Record<string, unknown> {
    const changes: Record<string, unknown> = {}
    const text = (key: keyof typeof initial) => {
      if (form[key] !== initial[key]) changes[key] = String(form[key]).trim()
    }
    const number = (key: "heightCm" | "weightKg") => {
      if (form[key] !== initial[key]) changes[key] = form[key].trim() === "" ? null : Number(form[key])
    }
    const list = (key: "dietTypes" | "allergens") => {
      const a = [...form[key]].sort().join("|")
      const b = [...initial[key]].sort().join("|")
      if (a !== b) changes[key] = form[key]
    }
    text("fullName")
    text("email")
    if (form.phone !== initial.phone) changes.phone = form.phone.trim() === "" ? null : form.phone.trim()
    if (form.gender !== initial.gender) changes.gender = form.gender === "" ? null : form.gender
    if (form.dateOfBirth !== initial.dateOfBirth) changes.dateOfBirth = form.dateOfBirth === "" ? null : form.dateOfBirth
    number("heightCm")
    number("weightKg")
    if (form.goal !== initial.goal && form.goal) changes.goal = form.goal
    list("dietTypes")
    list("allergens")
    text("addressDoorNumber")
    if (form.addressBuildingName !== initial.addressBuildingName) changes.addressBuildingName = form.addressBuildingName.trim() === "" ? null : form.addressBuildingName.trim()
    text("addressStreet")
    text("addressArea")
    text("addressPostcode")
    if (form.marketingOptIn !== initial.marketingOptIn) changes.marketingOptIn = form.marketingOptIn
    if (form.accountStatus !== initial.accountStatus) changes.accountStatus = form.accountStatus
    return changes
  }

  async function handleSave() {
    const changes = buildChanges()
    if (Object.keys(changes).length === 0) return setErrors(["No changes to save."])
    for (const key of ["heightCm", "weightKg"] as const) {
      if (typeof changes[key] === "number" && Number.isNaN(changes[key])) return (setBadFields([key]), setErrors([`${FIELD_LABELS[key]}: enter a number.`]))
    }
    setSaving(true)
    setErrors([])
    setBadFields([])
    try {
      const result = await api.patch<EditResult>(`/customers/${customer.id}`, changes)
      await onSaved(result)
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        setBadFields(err.details.map((d) => String(d.path[0] ?? "")))
        setErrors(err.details.map((d) => `${FIELD_LABELS[String(d.path[0])] ?? String(d.path[0] ?? "Field")}: ${d.message}`))
      } else {
        setErrors([err instanceof ApiError ? err.message : "Couldn't save these changes. Try again."])
      }
      setSaving(false)
    }
  }

  const emailChanging = form.email.trim().toLowerCase() !== initial.email.toLowerCase()

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Edit customer details">
      <div className="bg-white rounded-[16px] w-full max-w-[720px] max-h-[92vh] shadow-xl flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-[18px] font-bold">Edit customer details</h3>
          <button onClick={onClose} className="cursor-pointer" aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-7">
          <Section title="Contact">
            <Field label="Full name">
              <input className={inputClass} value={form.fullName} aria-invalid={bad("fullName")} onChange={(e) => set("fullName", e.target.value)} />
            </Field>
            <Field label="Email">
              <input className={inputClass} type="email" value={form.email} aria-invalid={bad("email")} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Phone" hint="International format, e.g. +447123456789. Leave empty to remove.">
              <input className={inputClass} type="tel" value={form.phone} aria-invalid={bad("phone")} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            {emailChanging ? (
              <p className="sm:col-span-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Changing the email signs this customer out. They'll log in with a code sent to the new address.
              </p>
            ) : null}
          </Section>

          <Section title="Personal & health">
            <Field label="Gender">
              <select className={inputClass} value={form.gender} aria-invalid={bad("gender")} onChange={(e) => set("gender", e.target.value)}>
                <option value="">Not set</option>
                {[...new Set([...GENDER_OPTIONS, ...(initial.gender ? [initial.gender] : [])])].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date of birth" hint="Must be between 16 and 100 years old.">
              <input className={inputClass} type="date" value={form.dateOfBirth} aria-invalid={bad("dateOfBirth")} onChange={(e) => set("dateOfBirth", e.target.value)} />
            </Field>
            <Field label="Height (cm)">
              <input className={inputClass} type="number" min={50} max={260} step="0.1" value={form.heightCm} aria-invalid={bad("heightCm")} onChange={(e) => set("heightCm", e.target.value)} />
            </Field>
            <Field label="Weight (kg)">
              <input className={inputClass} type="number" min={20} max={500} step="0.1" value={form.weightKg} aria-invalid={bad("weightKg")} onChange={(e) => set("weightKg", e.target.value)} />
            </Field>
          </Section>

          <div>
            <h4 className="text-[13px] font-bold text-gray-900 mb-3">Food preferences</h4>
            <div className="space-y-4">
              <Field label="Style">
                <select className={inputClass} value={form.goal} aria-invalid={bad("goal")} onChange={(e) => set("goal", e.target.value)}>
                  {!initial.goal ? <option value="">Not set</option> : null}
                  {Object.entries(GOAL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Food types">
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {Object.entries(DIET_LABELS).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.dietTypes.includes(value)} onChange={() => toggle("dietTypes", value)} />
                      {label}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Allergens to avoid">
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {allergenOptions.length === 0 ? <span className="text-sm text-gray-400">{allergenQuery.isLoading ? "Loading…" : "No allergens configured."}</span> : null}
                  {allergenOptions.map((name) => (
                    <label key={name} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.allergens.includes(name)} onChange={() => toggle("allergens", name)} />
                      {name}
                    </label>
                  ))}
                </div>
              </Field>
            </div>
          </div>

          <Section title="Delivery address">
            <Field label="Door number">
              <input className={inputClass} value={form.addressDoorNumber} aria-invalid={bad("addressDoorNumber")} onChange={(e) => set("addressDoorNumber", e.target.value)} />
            </Field>
            <Field label="Building name (optional)">
              <input className={inputClass} value={form.addressBuildingName} aria-invalid={bad("addressBuildingName")} onChange={(e) => set("addressBuildingName", e.target.value)} />
            </Field>
            <Field label="Street">
              <input className={inputClass} value={form.addressStreet} aria-invalid={bad("addressStreet")} onChange={(e) => set("addressStreet", e.target.value)} />
            </Field>
            <Field label="Area">
              <input className={inputClass} value={form.addressArea} aria-invalid={bad("addressArea")} onChange={(e) => set("addressArea", e.target.value)} />
            </Field>
            <Field label="Postcode" hint="Must be inside an active delivery zone.">
              <input className={inputClass} value={form.addressPostcode} aria-invalid={bad("addressPostcode")} onChange={(e) => set("addressPostcode", e.target.value)} />
            </Field>
          </Section>

          <Section title="Account">
            <Field label="Account status">
              <select className={inputClass} value={form.accountStatus} aria-invalid={bad("accountStatus")} onChange={(e) => set("accountStatus", e.target.value)}>
                {initial.accountStatus === "PROVISIONAL" ? <option value="PROVISIONAL">Provisional (signup in progress)</option> : null}
                <option value="ACTIVE">Active</option>
                <option value="READ_ONLY">Read-only</option>
              </select>
            </Field>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.marketingOptIn} onChange={(e) => set("marketingOptIn", e.target.checked)} />
                Customer has agreed to marketing emails
              </label>
            </div>
          </Section>

          {errors.length > 0 ? (
            <div role="alert" className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-status-red space-y-1">
              {errors.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          ) : null}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">Each change is logged against your admin account.</p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold cursor-pointer">
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-2 bg-[#2E6B3E] text-white rounded-lg font-semibold text-sm cursor-pointer disabled:opacity-60">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
