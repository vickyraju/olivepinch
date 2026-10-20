// Works out what an admin edit actually changes, so the route only writes real differences and the
// audit log records them. Pure (no DB) so it can be tested directly.

export interface CustomerLike {
  fullName: string
  email: string | null
  phone: string | null
  gender: string | null
  dateOfBirth: Date | null
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

// Every field is optional: only what the admin sent is considered. "" and null both mean "clear it"
// for the optional text fields.
export type CustomerEdit = Partial<{
  fullName: string
  email: string
  phone: string | null
  gender: string | null
  dateOfBirth: string | null // YYYY-MM-DD
  heightCm: number | null
  weightKg: number | null
  goal: string
  dietTypes: string[]
  allergens: string[]
  addressDoorNumber: string
  addressBuildingName: string | null
  addressStreet: string
  addressArea: string
  addressPostcode: string
  marketingOptIn: boolean
  accountStatus: string
}>

// Health data (age, body measurements, allergies) is special-category: the audit log records that it
// changed, never the values. Contact and address details are named but not copied into the log either.
// Only low-sensitivity settings get old -> new values.
const LOGGED_WITH_VALUES = ["goal", "dietTypes", "marketingOptIn", "accountStatus"] as const

const blankToNull = (v: string | null | undefined) => (v === undefined || v === null || v.trim() === "" ? null : v.trim())
const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i])
const dayOf = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null)

export function diffCustomerEdit(existing: CustomerLike, edit: CustomerEdit) {
  const data: Record<string, unknown> = {}
  const changed: string[] = []
  const detailParts: string[] = []

  function set(field: keyof CustomerEdit, next: unknown, differs: boolean, previous: unknown) {
    if (!differs) return
    data[field] = next
    changed.push(field)
    if ((LOGGED_WITH_VALUES as readonly string[]).includes(field)) {
      const show = (v: unknown) => (Array.isArray(v) ? v.join(", ") || "none" : String(v))
      detailParts.push(`${field}: ${show(previous)} → ${show(next)}`)
    }
  }

  const text = (field: "fullName" | "email" | "addressDoorNumber" | "addressStreet" | "addressArea" | "addressPostcode") => {
    if (edit[field] === undefined) return
    const next = edit[field]!.trim()
    set(field, next, next !== (existing[field] ?? ""), existing[field])
  }
  const optionalText = (field: "phone" | "gender" | "addressBuildingName") => {
    if (edit[field] === undefined) return
    const next = blankToNull(edit[field])
    set(field, next, next !== (existing[field] ?? null), existing[field])
  }

  text("fullName")
  text("email")
  optionalText("phone")
  optionalText("gender")
  if (edit.dateOfBirth !== undefined) {
    const next = blankToNull(edit.dateOfBirth)
    set("dateOfBirth", next ? new Date(`${next}T00:00:00.000Z`) : null, next !== dayOf(existing.dateOfBirth), dayOf(existing.dateOfBirth))
  }
  if (edit.heightCm !== undefined) set("heightCm", edit.heightCm, edit.heightCm !== existing.heightCm, existing.heightCm)
  if (edit.weightKg !== undefined) set("weightKg", edit.weightKg, edit.weightKg !== existing.weightKg, existing.weightKg)
  if (edit.goal !== undefined) set("goal", edit.goal, edit.goal !== existing.goal, existing.goal)
  if (edit.dietTypes !== undefined) set("dietTypes", edit.dietTypes, !sameSet(edit.dietTypes, existing.dietTypes), existing.dietTypes)
  if (edit.allergens !== undefined) set("allergens", edit.allergens, !sameSet(edit.allergens, existing.allergens), existing.allergens)
  text("addressDoorNumber")
  optionalText("addressBuildingName")
  text("addressStreet")
  text("addressArea")
  text("addressPostcode")
  if (edit.marketingOptIn !== undefined) set("marketingOptIn", edit.marketingOptIn, edit.marketingOptIn !== existing.marketingOptIn, existing.marketingOptIn)
  if (edit.accountStatus !== undefined) set("accountStatus", edit.accountStatus, edit.accountStatus !== existing.accountStatus, existing.accountStatus)

  const emailChanged = changed.includes("email")
  // The login account is matched by email, so a new address must be linked afresh on the next login.
  if (emailChanged) data.authUserId = null

  const detail = [`Changed: ${changed.join(", ")}`, ...detailParts].join(" · ")
  return { data, changed, detail, emailChanged }
}
