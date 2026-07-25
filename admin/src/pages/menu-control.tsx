import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Header } from "@/components/header"
import { CardGridSkeleton } from "@/components/skeletons/card-grid-skeleton"
import { api, ApiError } from "@/lib/api"
import { formatGBP } from "@/lib/currency"

interface MenuItem {
  id: string
  name: string
  description: string
  photoUrl: string | null
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

type SlotFilter = "ALL" | "BREAKFAST" | "LUNCH" | "DINNER"

const slotFilters: { key: SlotFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "BREAKFAST", label: "Breakfast" },
  { key: "LUNCH", label: "Lunch" },
  { key: "DINNER", label: "Dinner" },
]

const emptyForm = {
  name: "",
  description: "",
  photoUrl: "",
  slot: "LUNCH",
  dietTags: [] as string[],
  allergenTags: "",
  goalTags: [] as string[],
  kcal: "",
  protein: "",
  price: "",
  dailyCapacity: "",
  premium: false,
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
      <span className={`text-sm font-semibold ${checked ? "text-primary" : "text-gray-400"}`}>
        {checked ? "Premium" : "Standard"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-primary" : "bg-gray-300"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  )
}

function MenuItemCard({
  item,
  onSaveCapacity,
  onTogglePremium,
  onRequestDelete,
}: {
  item: MenuItem
  onSaveCapacity: (item: MenuItem, capacity: number) => Promise<void>
  onTogglePremium: (item: MenuItem, premium: boolean) => Promise<void>
  onRequestDelete: (item: MenuItem) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftCapacity, setDraftCapacity] = useState(item.dailyCapacity ?? 0)
  const [saving, setSaving] = useState(false)

  const hasChanged = draftCapacity !== (item.dailyCapacity ?? 0)

  function startEdit() {
    setDraftCapacity(item.dailyCapacity ?? 0)
    setIsEditing(true)
  }

  async function handleSave() {
    if (!hasChanged) return
    setSaving(true)
    try {
      await onSaveCapacity(item, draftCapacity)
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="bg-white rounded-[12px] border border-gray-200 hover:border-gray-300 overflow-hidden flex flex-col transition-colors">
      <div className="relative h-[160px] w-full bg-gray-100 flex items-center justify-center overflow-hidden">
        {item.photoUrl ? (
          <img src={item.photoUrl} className="w-full h-full object-cover" alt={item.name} />
        ) : (
          <span className="material-symbols-outlined text-[48px] text-gray-300">restaurant</span>
        )}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/90 text-gray-700 shadow-sm">
          {item.slot}
        </span>
        <button
          type="button"
          onClick={() => onRequestDelete(item)}
          title="Delete item"
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 text-status-red hover:bg-status-red hover:text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="text-[16px] font-bold text-gray-900">{item.name}</h3>
          <ToggleSwitch checked={item.premium} onChange={() => void onTogglePremium(item, !item.premium)} />
        </div>
        <p className="text-[14px] text-gray-500 mb-3">{item.description}</p>
        <div className="flex gap-1.5 flex-wrap mb-4">
          {item.dietTags.map((t) => (
            <span key={t} className="px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-green-50 text-green-700 border-green-200">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-auto space-y-3">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="font-bold text-[16px] text-[#2E6B3E]">{formatGBP(Number(item.price))}</span>
            <span>·</span>
            <span>{item.kcal} kcal</span>
            <span>·</span>
            <span>{item.protein}g protein</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Daily capacity</span>
            {!isEditing ? (
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-sm">{item.dailyCapacity ?? "Unlimited"}</span>
                <button
                  onClick={startEdit}
                  className="px-2 py-1 rounded-md border border-primary text-primary text-xs font-semibold hover:bg-[#F0F7F3] transition-colors cursor-pointer"
                >
                  Edit
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDraftCapacity((d) => Math.max(0, d - 1))}
                  disabled={draftCapacity === 0}
                  className="w-7 h-7 border border-gray-200 rounded bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">remove</span>
                </button>
                <span className="font-bold w-6 text-center">{draftCapacity}</span>
                <button
                  onClick={() => setDraftCapacity((d) => d + 1)}
                  className="w-7 h-7 border border-gray-200 rounded bg-white text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
            )}
          </div>
          {isEditing ? (
            <div className="flex items-center justify-end gap-4 pt-1">
              <button onClick={() => setIsEditing(false)} className="text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanged || saving}
                className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-semibold disabled:opacity-40 transition-opacity cursor-pointer"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function MenuControl() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [slotFilter, setSlotFilter] = useState<SlotFilter>("ALL")
  const [showModal, setShowModal] = useState(false)
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const menuQuery = useQuery({ queryKey: ["menu-items"], queryFn: () => api.get<MenuItem[]>("/menu-items") })

  const items = useMemo(() => {
    let rows = menuQuery.data ?? []
    const q = search.trim().toLowerCase()
    if (q) rows = rows.filter((i) => i.name.toLowerCase().includes(q))
    if (slotFilter !== "ALL") rows = rows.filter((i) => i.slot === slotFilter)
    return rows
  }, [menuQuery.data, search, slotFilter])

  async function saveCapacity(item: MenuItem, dailyCapacity: number) {
    await api.patch(`/menu-items/${item.id}`, { dailyCapacity })
    await queryClient.invalidateQueries({ queryKey: ["menu-items"] })
  }

  async function togglePremium(item: MenuItem, premium: boolean) {
    await api.patch(`/menu-items/${item.id}`, { premium })
    await queryClient.invalidateQueries({ queryKey: ["menu-items"] })
  }

  async function deleteItem(item: MenuItem) {
    await api.del(`/menu-items/${item.id}`)
    setDeletingItem(null)
    await queryClient.invalidateQueries({ queryKey: ["menu-items"] })
  }

  function toggleDiet(diet: string) {
    setForm((f) => ({ ...f, dietTags: f.dietTags.includes(diet) ? f.dietTags.filter((d) => d !== diet) : [...f.dietTags, diet] }))
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(undefined)
    setSaving(true)
    try {
      if (!form.name.trim() || !form.dietTags.length || !form.kcal || !form.protein || !form.price) {
        throw new Error("Fill in name, at least one diet tag, kcal, protein, and price.")
      }
      await api.post("/menu-items", {
        name: form.name.trim(),
        description: form.description.trim(),
        photoUrl: form.photoUrl.trim() || undefined,
        slot: form.slot,
        dietTags: form.dietTags,
        allergenTags: form.allergenTags ? form.allergenTags.split(",").map((s) => s.trim()).filter(Boolean) : [],
        goalTags: form.goalTags,
        kcal: Number(form.kcal),
        protein: Number(form.protein),
        price: Number(form.price),
        premium: form.premium,
        dailyCapacity: form.dailyCapacity ? Number(form.dailyCapacity) : undefined,
      })
      await queryClient.invalidateQueries({ queryKey: ["menu-items"] })
      setShowModal(false)
      setForm(emptyForm)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Could not save item")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden ml-[260px] dot-texture">
      <Header title="Menu Management" />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-6 flex justify-between items-center">
          <div className="relative w-full max-w-[280px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm"
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#2E6B3E] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span> Add Menu Item
          </button>
        </div>
        <div className="mb-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {slotFilters.map((s) => (
            <button
              key={s.key}
              onClick={() => setSlotFilter(s.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors shrink-0 cursor-pointer ${
                slotFilter === s.key ? "bg-[#2E6B3E] text-white" : "text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {menuQuery.isLoading ? (
            <CardGridSkeleton />
          ) : (
            <>
              {items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onSaveCapacity={saveCapacity}
                  onTogglePremium={togglePremium}
                  onRequestDelete={setDeletingItem}
                />
              ))}
              {items.length === 0 ? <p className="col-span-full text-center text-sm text-gray-400 py-10">No menu items found.</p> : null}
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[16px] w-[480px] shadow-xl flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-[18px] font-bold">Add Menu Item</h3>
              <button onClick={() => setShowModal(false)} className="cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Item Name</label>
                <input
                  className="w-full h-10 border border-gray-200 rounded-lg px-3"
                  placeholder="e.g. Grilled Chicken & Rice Bowl"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg p-3 h-20 resize-none"
                  placeholder="Short description..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Meal Slot</label>
                <select
                  className="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm"
                  value={form.slot}
                  onChange={(e) => setForm((f) => ({ ...f, slot: e.target.value }))}
                >
                  {SLOTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Diet Tags</label>
                <div className="flex gap-2 flex-wrap">
                  {DIETS.map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => toggleDiet(d)}
                      className={`px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
                        form.dietTags.includes(d) ? "bg-[#2E6B3E] text-white border-[#2E6B3E]" : "bg-white border-gray-300 text-gray-700"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Allergen Tags (comma-separated)</label>
                <input
                  className="w-full h-10 border border-gray-200 rounded-lg px-3"
                  placeholder="Gluten, Dairy"
                  value={form.allergenTags}
                  onChange={(e) => setForm((f) => ({ ...f, allergenTags: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Calories</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full h-10 border border-gray-200 rounded-lg px-3"
                    value={form.kcal}
                    onChange={(e) => setForm((f) => ({ ...f, kcal: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Protein (g)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full h-10 border border-gray-200 rounded-lg px-3"
                    value={form.protein}
                    onChange={(e) => setForm((f) => ({ ...f, protein: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Price (£)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full h-10 border border-gray-200 rounded-lg px-3"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Daily Capacity</label>
                <input
                  type="number"
                  min="0"
                  className="w-full h-10 border border-gray-200 rounded-lg px-3"
                  placeholder="Leave blank for unlimited"
                  value={form.dailyCapacity}
                  onChange={(e) => setForm((f) => ({ ...f, dailyCapacity: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Photo URL</label>
                <input
                  className="w-full h-10 border border-gray-200 rounded-lg px-3"
                  placeholder="https://..."
                  value={form.photoUrl}
                  onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))}
                />
              </div>
              <ToggleSwitch checked={form.premium} onChange={() => setForm((f) => ({ ...f, premium: !f.premium }))} />
              {error ? <p role="alert" className="text-sm text-status-red">{error}</p> : null}
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-primary text-white rounded-lg font-semibold text-sm disabled:opacity-60 cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[16px] w-[400px] shadow-xl p-6">
            <h3 className="text-[18px] font-bold mb-2">Delete "{deletingItem.name}"?</h3>
            <p className="text-sm text-gray-500 mb-6">It will no longer appear as a default menu option. This can't be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeletingItem(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => deleteItem(deletingItem)}
                className="px-4 py-2 bg-status-red text-white rounded-lg text-sm font-semibold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default MenuControl
