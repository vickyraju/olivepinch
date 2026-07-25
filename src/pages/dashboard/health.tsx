import { useState } from "react"
import { Plus } from "lucide-react"
import { useDashboard } from "@/lib/dashboard-context"
import { calculateBmi, bmiCategory, BMI_CATEGORY_COLOR } from "@/lib/bmi"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkline } from "@/components/ui/sparkline"

const FIELDS: { key: "heightCm" | "weightKg" | "chestCm" | "bicepCm" | "abdomenCm" | "waistCm"; label: string; unit: string }[] = [
  { key: "heightCm", label: "Height", unit: "cm" },
  { key: "weightKg", label: "Weight", unit: "kg" },
  { key: "chestCm", label: "Chest", unit: "cm" },
  { key: "bicepCm", label: "Bicep", unit: "cm" },
  { key: "abdomenCm", label: "Abdomen", unit: "cm" },
  { key: "waistCm", label: "Waist", unit: "cm" },
]

function Health() {
  const { customer, addHealthLog } = useDashboard()
  const [showForm, setShowForm] = useState(false)
  const sortedLogs = [...customer.healthLogs].sort((a, b) => b.date.localeCompare(a.date))
  const latest = sortedLogs[0]
  const [form, setForm] = useState(() => ({
    heightCm: String(latest?.heightCm ?? ""),
    weightKg: "",
    chestCm: "",
    bicepCm: "",
    abdomenCm: "",
    waistCm: "",
  }))

  const bmi = latest ? calculateBmi(latest.heightCm, latest.weightKg) : null
  const category = bmi ? bmiCategory(bmi) : null
  const weightTrend = [...sortedLogs].reverse().map((l) => l.weightKg)

  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const values = Object.fromEntries(FIELDS.map((f) => [f.key, parseFloat(form[f.key])])) as Record<string, number>
    if (Object.values(values).some((v) => isNaN(v))) return
    setSaving(true)
    try {
      await addHealthLog(values as Omit<typeof customer.healthLogs[number], "id" | "date">)
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl text-ink mb-1">Health Tracker</h1>
          <p className="text-ink-muted">Weekly logging is encouraged, never required.</p>
        </div>
        <Button type="button" variant="accent" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Log entry
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 sm:p-8">
          <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <Label htmlFor={f.key}>{f.label} ({f.unit})</Label>
                <Input
                  id={f.key}
                  type="number"
                  inputMode="decimal"
                  required
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              </div>
            ))}
            <div className="col-span-2 sm:col-span-3 flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>{saving ? "Saving…" : "Save entry"}</Button>
            </div>
          </form>
        </Card>
      )}

      {latest && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-6">
            <p className="text-sm text-ink-muted mb-1">Current BMI</p>
            <div className="flex items-center gap-3">
              <span className="font-display text-4xl font-bold text-ink">{bmi!.toFixed(1)}</span>
              {category && <Badge variant={BMI_CATEGORY_COLOR[category]}>{category}</Badge>}
            </div>
            <p className="text-xs text-ink-muted mt-2">From your {new Date(latest.date).toLocaleDateString("en-GB")} entry</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-ink-muted mb-2">Weight trend</p>
            <Sparkline values={weightTrend} />
          </Card>
        </div>
      )}

      <div>
        <h2 className="text-lg text-ink mb-3">Log history</h2>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-border text-left text-ink-muted">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Weight</th>
                <th className="p-4 font-medium">Chest</th>
                <th className="p-4 font-medium">Bicep</th>
                <th className="p-4 font-medium">Abdomen</th>
                <th className="p-4 font-medium">Waist</th>
              </tr>
            </thead>
            <tbody>
              {sortedLogs.map((log) => (
                <tr key={log.id} className="border-b border-border last:border-0">
                  <td className="p-4 text-ink font-medium">{new Date(log.date).toLocaleDateString("en-GB")}</td>
                  <td className="p-4 text-ink">{log.weightKg} kg</td>
                  <td className="p-4 text-ink">{log.chestCm} cm</td>
                  <td className="p-4 text-ink">{log.bicepCm} cm</td>
                  <td className="p-4 text-ink">{log.abdomenCm} cm</td>
                  <td className="p-4 text-ink">{log.waistCm} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

export default Health
