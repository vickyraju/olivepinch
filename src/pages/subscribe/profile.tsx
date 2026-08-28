import { Link, useNavigate } from "react-router-dom"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/ui/phone-input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useSubscribe, type Gender } from "@/lib/subscribe-context"
import { calculateBmi, bmiCategory, BMI_CATEGORY_COLOR } from "@/lib/bmi"
import { calculateAge } from "@/lib/subscription"
import { splitFullName, joinFullName } from "@/lib/utils"
import { StepNav } from "./step-nav"
import { useState } from "react"

const GENDERS: Gender[] = ["Female", "Male", "Non-binary", "Prefer not to say"]

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

// Only the years that satisfy the 16-100 check below, so nothing in the list can be picked
// and then immediately rejected.
const CURRENT_YEAR = new Date().getFullYear()
const DOB_YEARS = Array.from({ length: 100 - 16 + 1 }, (_, i) => CURRENT_YEAR - 16 - i)

function Profile() {
  const { state, update } = useSubscribe()
  const navigate = useNavigate()
  const [healthConsent, setHealthConsent] = useState(false)
  const p = state.profile
  const { firstName, lastName } = splitFullName(p.fullName)

  // Held locally as well as in context so a half-finished pick (month chosen, year not yet)
  // still shows in the dropdowns — dateOfBirth stays empty until both are set.
  const initialDob = p.dateOfBirth ? p.dateOfBirth.split("-").map(Number) : []
  const [dobMonth, setDobMonth] = useState<number | undefined>(initialDob[1])
  const [dobYear, setDobYear] = useState<number | undefined>(initialDob[0])

  function updateBirthMonth(month?: number, year?: number) {
    setDobMonth(month)
    setDobYear(year)
    // Day is fixed to the 1st — we only ever collect month + year of birth, never the day.
    update({
      profile: { ...p, dateOfBirth: month && year ? `${year}-${String(month).padStart(2, "0")}-01` : "" },
    })
  }

  const height = parseFloat(p.heightCm)
  const weight = parseFloat(p.weightKg)
  const hasHealthData = !isNaN(height) && !isNaN(weight) && height > 0 && weight > 0
  const bmi = hasHealthData ? calculateBmi(height, weight) : null
  const category = bmi ? bmiCategory(bmi) : null

  const age = p.dateOfBirth ? calculateAge(p.dateOfBirth) : null
  const dobValid = age !== null && age >= 16 && age <= 100

  const canContinue =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    p.phone.trim().length > 0 &&
    p.gender !== "" &&
    dobValid &&
    hasHealthData &&
    healthConsent

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl text-ink mb-2">Tell us about you</h1>
      <p className="text-ink-muted mb-8">We'll use this to calculate your BMI and recommend meals for your goal.</p>

      <div className="rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-soft space-y-5">
        <div className="grid grid-cols-2 gap-4">
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

        <div>
          <Label htmlFor="phone">Phone number</Label>
          <PhoneInput
            id="phone"
            value={p.phone}
            onChange={(v) => update({ profile: { ...p, phone: v } })}
          />
        </div>

        <div>
          <Label htmlFor="gender">Gender</Label>
          <Select value={p.gender} onValueChange={(v) => update({ profile: { ...p, gender: v as Gender } })}>
            <SelectTrigger id="gender">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="dobMonth">Birth month &amp; year</Label>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={dobMonth ? String(dobMonth) : ""}
              onValueChange={(v) => updateBirthMonth(Number(v), dobYear)}
            >
              <SelectTrigger id="dobMonth" aria-label="Month" aria-invalid={p.dateOfBirth !== "" && !dobValid}>
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, i) => (
                  <SelectItem key={month} value={String(i + 1)}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dobYear ? String(dobYear) : ""}
              onValueChange={(v) => updateBirthMonth(dobMonth, Number(v))}
            >
              <SelectTrigger aria-label="Year" aria-invalid={p.dateOfBirth !== "" && !dobValid}>
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {DOB_YEARS.map((year) => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {p.dateOfBirth !== "" && !dobValid && (
            <p className="mt-1.5 text-sm text-coral-600">You must be between 16 and 100 years old.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="height">Height (cm)</Label>
            <Input
              id="height"
              type="number"
              inputMode="decimal"
              value={p.heightCm}
              onChange={(e) => update({ profile: { ...p, heightCm: e.target.value } })}
            />
          </div>
          <div>
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              inputMode="decimal"
              value={p.weightKg}
              onChange={(e) => update({ profile: { ...p, weightKg: e.target.value } })}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-cream-100 p-4">
          <div className="flex gap-3">
            <Checkbox
              id="health-consent"
              checked={healthConsent}
              onCheckedChange={(v) => setHealthConsent(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="health-consent" className="mb-0 font-normal leading-snug cursor-pointer">
              I consent to OlivePinch collecting my height, weight, and body measurements
              to calculate my BMI and recommend meals for my goal. This is special category
              health data under UK GDPR — see our{" "}
              <Link to="/privacy-policy" target="_blank" className="text-olive-600 underline">Privacy Policy</Link>.
            </Label>
          </div>
        </div>

        {bmi && category && (
          <div className="rounded-lg bg-olive-50 p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm text-ink-muted">Your BMI</p>
              <p className="font-display text-3xl font-bold text-ink">{bmi.toFixed(1)}</p>
            </div>
            <Badge variant={BMI_CATEGORY_COLOR[category]}>{category}</Badge>
          </div>
        )}
      </div>

      <StepNav
        backTo="/subscribe/menu"
        continueDisabled={!canContinue}
        onContinue={() => navigate("/subscribe/delivery")}
      />
    </div>
  )
}

export default Profile
