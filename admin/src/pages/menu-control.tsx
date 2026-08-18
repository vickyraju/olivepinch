import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2, Pencil, Search } from "lucide-react"
import { api } from "@/lib/api"
import { formatGBP } from "@/lib/currency"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface MenuItem {
  id: string
  name: string
  description: string
  slot: string
  dietTags: string[]
  allergenTags: string[]
  goalTags: string[]
  kcal: number
  protein: number
  price: string
  premium: boolean
  dailyCapacity: number | null
}

const SLOTS = ["BREAKFAST", "LUNCH", "DINNER"]
const DIETS = ["MEAT", "FISH", "VEGAN", "VEGETARIAN", "EGG"]

const emptyForm = {
  name: "", description: "", slot: "LUNCH", dietTags: [] as string[], allergenTags: "",
  goalTags: [] as string[], kcal: "", protein: "", price: "", dailyCapacity: "",
}

function MenuControl() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState("")
  const [nameFilter, setNameFilter] = useState("")
  const [slotFilter, setSlotFilter] = useState("")

  function load() {
    setLoading(true)
    api.get<MenuItem[]>("/menu-items").then(setItems).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const visibleItems = useMemo(() => {
    const q = nameFilter.trim().toLowerCase()
    return items.filter((item) => (!q || item.name.toLowerCase().includes(q)) && (!slotFilter || item.slot === slotFilter))
  }, [items, nameFilter, slotFilter])

  function startEdit(item: MenuItem) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      description: item.description,
      slot: item.slot,
      dietTags: item.dietTags,
      allergenTags: item.allergenTags.join(", "),
      goalTags: item.goalTags,
      kcal: String(item.kcal),
      protein: String(item.protein),
      price: item.price,
      dailyCapacity: item.dailyCapacity != null ? String(item.dailyCapacity) : "",
    })
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setError("")
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!form.name || !form.dietTags.length || !form.kcal || !form.protein || !form.price) {
      setError("Fill in name, at least one diet tag, kcal, protein, and price.")
      return
    }
    const payload = {
      name: form.name,
      description: form.description,
      slot: form.slot,
      dietTags: form.dietTags,
      allergenTags: form.allergenTags ? form.allergenTags.split(",").map((s) => s.trim()) : [],
      goalTags: form.goalTags,
      kcal: Number(form.kcal),
      protein: Number(form.protein),
      price: Number(form.price),
      dailyCapacity: form.dailyCapacity ? Number(form.dailyCapacity) : undefined,
    }
    try {
      if (editingId) {
        await api.patch(`/menu-items/${editingId}`, payload)
      } else {
        await api.post("/menu-items", payload)
      }
      cancelForm()
      load()
    } catch {
      setError("Could not save this item — check the fields and try again.")
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this menu item? It will no longer appear as a default option.")) return
    await api.del(`/menu-items/${id}`)
    load()
  }

  function toggleDiet(diet: string) {
    setForm((f) => ({ ...f, dietTags: f.dietTags.includes(diet) ? f.dietTags.filter((d) => d !== diet) : [...f.dietTags, diet] }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl text-ink">Menu Control</h1>
        <Button size="sm" onClick={() => (showForm ? cancelForm() : setShowForm(true))}>
          <Plus className="h-4 w-4" /> New item
        </Button>
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <Input placeholder="Search by name" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} className="pl-9" />
        </div>
        <select
          value={slotFilter}
          onChange={(e) => setSlotFilter(e.target.value)}
          className="flex h-10 rounded-md border border-border bg-surface px-3 text-sm text-ink cursor-pointer"
        >
          <option value="">All slots</option>
          {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {showForm && (
        <Card>
          <CardContent>
            <form onSubmit={submit} className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="slot">Meal slot</Label>
                <select
                  id="slot"
                  value={form.slot}
                  onChange={(e) => setForm({ ...form, slot: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink"
                >
                  {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Diet tags</Label>
                <div className="flex gap-2 flex-wrap">
                  {DIETS.map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => toggleDiet(d)}
                      className={`px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer ${
                        form.dietTags.includes(d) ? "bg-olive-600 text-white border-olive-600" : "bg-surface border-border text-ink"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="allergens">Allergen tags (comma-separated)</Label>
                <Input id="allergens" value={form.allergenTags} onChange={(e) => setForm({ ...form, allergenTags: e.target.value })} placeholder="Gluten, Dairy" />
              </div>
              <div>
                <Label htmlFor="capacity">Daily capacity</Label>
                <Input id="capacity" type="number" value={form.dailyCapacity} onChange={(e) => setForm({ ...form, dailyCapacity: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="kcal">Calories (kcal)</Label>
                <Input id="kcal" type="number" value={form.kcal} onChange={(e) => setForm({ ...form, kcal: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="protein">Protein (g)</Label>
                <Input id="protein" type="number" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="price">Price (£)</Label>
                <Input id="price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              {error && <p role="alert" className="col-span-2 text-sm text-destructive">{error}</p>}
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={cancelForm}>Cancel</Button>
                <Button type="submit">{editingId ? "Update item" : "Save item"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-5 text-sm text-ink-muted">Loading…</p>
          ) : visibleItems.length === 0 ? (
            <p className="p-5 text-sm text-ink-muted">No menu items match your filters.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-ink-muted">
                  <th className="px-5 py-2.5 font-medium">Name</th>
                  <th className="px-5 py-2.5 font-medium">Slot</th>
                  <th className="px-5 py-2.5 font-medium">Diet tags</th>
                  <th className="px-5 py-2.5 font-medium">Capacity</th>
                  <th className="px-5 py-2.5 font-medium text-right">Price</th>
                  <th className="px-5 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-2.5 text-ink font-medium">{item.name}</td>
                    <td className="px-5 py-2.5 text-ink-muted">{item.slot}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex gap-1 flex-wrap">
                        {item.dietTags.map((t) => <Badge key={t} className="bg-olive-50 text-olive-700 border-olive-100">{t}</Badge>)}
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-ink-muted">{item.dailyCapacity ?? "—"}</td>
                    <td className="px-5 py-2.5 text-ink text-right font-medium">{formatGBP(Number(item.price))}</td>
                    <td className="px-5 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => startEdit(item)} className="text-ink-muted hover:text-ink cursor-pointer" aria-label={`Edit ${item.name}`}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(item.id)} className="text-destructive hover:text-destructive/80 cursor-pointer" aria-label={`Remove ${item.name}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default MenuControl
