import { useNavigate } from "react-router-dom"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useSubscribe, type Gender } from "@/lib/subscribe-context"
import { calculateBmi, bmiCategory, BMI_CATEGORY_COLOR } from "@/lib/bmi"
import { StepNav } from "./step-nav"
import { useState } from "react"

const GENDERS: Gender[] = ["Female", "Male", "Non-binary", "Prefer not to say"]

function Profile() {
  const { state, update } = useSubscribe()
  const navigate = useNavigate()
  const [healthConsent, setHealthConsent] = useState(false)
  const p = state.profile

  const height = parseFloat(p.heightCm)
  const weight = parseFloat(p.weightKg)
  const hasHealthData = !isNaN(height) && !isNaN(weight) && height > 0 && weight > 0
  const bmi = hasHealthData ? calculateBmi(height, weight) : null
  const category = bmi ? bmiCategory(bmi) : null

  const canContinue =
    p.fullName.trim().length > 1 &&
    p.gender !== "" &&
    p.age !== "" &&
    hasHealthData &&
    healthConsent

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl text-ink mb-2">Tell us about you</h1>
      <p className="text-ink-muted mb-8">We'll use this to calculate your BMI and recommend meals for your goal.</p>

      <div className="rounded-2xl bg-surface border border-border p-6 sm:p-8 shadow-soft space-y-5">
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            autoComplete="name"
            value={p.fullName}
            onChange={(e) => update({ profile: { ...p, fullName: e.target.value } })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              min={16}
              max={100}
              inputMode="numeric"
              value={p.age}
              onChange={(e) => update({ profile: { ...p, age: e.target.value } })}
            />
          </div>
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
              <a href="#" className="text-olive-600 underline">Privacy Policy</a>.
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
        onContinue={() => navigate("/subscribe/account-setup")}
      />
    </div>
  )
}

export default Profile
