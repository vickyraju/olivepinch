import { useMemo, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Header } from "@/components/header"
import { CardGridSkeleton } from "@/components/skeletons/card-grid-skeleton"
import { api, ApiError } from "@/lib/api"

interface MenuItem {
  id: string
  name: string
  description: string
  photoUrl: string | null
  slot: string
  dietTags: string[]
  allergenTags: string[]
  goalTags: string[]
  tier: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

const SLOTS = ["BREAKFAST", "LUNCH", "DINNER"]
const SLOT_LABELS: Record<string, string> = { BREAKFAST: "Box1", LUNCH: "Box2", DINNER: "Box3" }
const DIETS = ["MEAT", "FISH", "VEGAN", "VEGETARIAN", "EGG"]
const GOALS = ["WEIGHT_LOSS", "WEIGHT_GAIN", "WEIGHT_MAINTENANCE", "MUSCLE_BUILDING"]
const GOAL_LABELS: Record<string, string> = {
  WEIGHT_LOSS: "Weight Loss",
  WEIGHT_GAIN: "Weight Gain",
  WEIGHT_MAINTENANCE: "Weight Maintenance",
  MUSCLE_BUILDING: "Muscle Building",
}
const TIERS = ["BASIC", "ADVANCED"]
const TIER_LABELS: Record<string, string> = { BASIC: "Basic", ADVANCED: "Advanced" }

// Must match REQUIRED_PHOTO_WIDTH/HEIGHT in the backend's admin/menu-items route.
const REQUIRED_PHOTO_WIDTH = 1200
const REQUIRED_PHOTO_HEIGHT = 800

type SlotFilter = "ALL" | "BREAKFAST" | "LUNCH" | "DINNER"

const slotFilters: { key: SlotFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "BREAKFAST", label: "Box1" },
  { key: "LUNCH", label: "Box2" },
  { key: "DINNER", label: "Box3" },
]

const emptyForm = {
  name: "",
  description: "",
  photoUrl: "",
  slot: "LUNCH",
  dietTags: [] as string[],
  allergenTags: [] as string[],
  goalTags: [] as string[],
  tier: "BASIC",
  kcal: "",
  protein: "",
  carbs: "",
  fat: "",
}

function readImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error("Could not read image"))
    img.src = dataUrl
  })
}

function MenuItemCard({
  item,
  onEdit,
  onRequestDelete,
}: {
  item: MenuItem
  onEdit: (item: MenuItem) => void
  onRequestDelete: (item: MenuItem) => void
}) {
  return (
    <article className="bg-white rounded-[12px] border border-gray-200 hover:border-gray-300 overflow-hidden flex flex-col transition-colors">
      <div className="relative h-[160px] w-full bg-gray-100 flex items-center justify-center overflow-hidden">
        {item.photoUrl ? (
          <img src={item.photoUrl} className="w-full h-full object-cover" alt={item.name} />
        ) : (
          <span className="material-symbols-outlined text-[48px] text-gray-300">restaurant</span>
        )}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/90 text-gray-700 shadow-sm">
          {SLOT_LABELS[item.slot] ?? item.slot}
        </span>
        <span
          className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-sm ${
            item.tier === "ADVANCED" ? "bg-amber-500 text-white" : "bg-white/90 text-gray-700"
          }`}
        >
          {TIER_LABELS[item.tier] ?? item.tier}
        </span>
        <div className="absolute top-2 right-2 flex gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(item)}
            title="Edit item"
            className="w-8 h-8 rounded-full bg-white/90 text-gray-700 hover:bg-[#2E6B3E] hover:text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button
            type="button"
            onClick={() => onRequestDelete(item)}
            title="Delete item"
            className="w-8 h-8 rounded-full bg-white/90 text-status-red hover:bg-status-red hover:text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-[16px] font-bold text-gray-900 mb-1">{item.name}</h3>
        <p className="text-[14px] text-gray-500 mb-3">{item.description}</p>
        <div className="flex gap-1.5 flex-wrap mb-4">
          {item.dietTags.map((t) => (
            <span key={t} className="px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-green-50 text-green-700 border-green-200">
              {t}
            </span>
          ))}
          {item.goalTags.slice(0, 1).map((t) => (
            <span key={t} className="px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-purple-50 text-purple-700 border-purple-200">
              {GOAL_LABELS[t] ?? t}
            </span>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-3 text-sm text-gray-600 flex-wrap">
          <span>{item.kcal} kcal</span>
          <span>·</span>
          <span>{item.protein}g protein</span>
          <span>·</span>
          <span>{item.carbs}g carbs</span>
          <span>·</span>
          <span>{item.fat}g fat</span>
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
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [photoError, setPhotoError] = useState<string | undefined>()

  const menuQuery = useQuery({ queryKey: ["menu-items"], queryFn: () => api.get<MenuItem[]>("/menu-items") })
  // Admin-managed via the Allergens page, rather than a fixed list — keeps this in step
  // with whatever admin has added/removed there.
  const allergensQuery = useQuery({
    queryKey: ["allergens"],
    queryFn: () => api.get<{ name: string; active: boolean }[]>("/allergens"),
  })
  const ALLERGENS = (allergensQuery.data ?? []).filter((a) => a.active).map((a) => a.name)

  const items = useMemo(() => {
    let rows = menuQuery.data ?? []
    const q = search.trim().toLowerCase()
    if (q) rows = rows.filter((i) => i.name.toLowerCase().includes(q))
    if (slotFilter !== "ALL") rows = rows.filter((i) => i.slot === slotFilter)
    return rows
  }, [menuQuery.data, search, slotFilter])

  async function deleteItem(item: MenuItem) {
    await api.del(`/menu-items/${item.id}`)
    setDeletingItem(null)
    await queryClient.invalidateQueries({ queryKey: ["menu-items"] })
  }

  function openCreateModal() {
    setEditingItem(null)
    setForm(emptyForm)
    setPhotoError(undefined)
    setError(undefined)
    setShowModal(true)
  }

  function openEditModal(item: MenuItem) {
    setEditingItem(item)
    setForm({
      name: item.name,
      description: item.description,
      photoUrl: item.photoUrl ?? "",
      slot: item.slot,
      dietTags: item.dietTags,
      allergenTags: item.allergenTags,
      goalTags: item.goalTags.slice(0, 1),
      tier: item.tier,
      kcal: String(item.kcal),
      protein: String(item.protein),
      carbs: String(item.carbs),
      fat: String(item.fat),
    })
    setPhotoError(undefined)
    setError(undefined)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingItem(null)
    setForm(emptyForm)
    setPhotoError(undefined)
  }

  function toggleDiet(diet: string) {
    setForm((f) => ({ ...f, dietTags: f.dietTags.includes(diet) ? f.dietTags.filter((d) => d !== diet) : [...f.dietTags, diet] }))
  }

  function selectGoal(goal: string) {
    setForm((f) => ({ ...f, goalTags: f.goalTags.includes(goal) ? [] : [goal] }))
  }

  function toggleAllergen(allergen: string) {
    setForm((f) => ({
      ...f,
      allergenTags: f.allergenTags.includes(allergen) ? f.allergenTags.filter((a) => a !== allergen) : [...f.allergenTags, allergen],
    }))
  }

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setPhotoError(undefined)
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setPhotoError("Photo must be a PNG or JPEG file.")
      return
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error("Could not read file"))
      reader.readAsDataURL(file)
    })
    const { width, height } = await readImageDimensions(dataUrl)
    if (width !== REQUIRED_PHOTO_WIDTH || height !== REQUIRED_PHOTO_HEIGHT) {
      setPhotoError(`Photo must be exactly ${REQUIRED_PHOTO_WIDTH}×${REQUIRED_PHOTO_HEIGHT}px (uploaded ${width}×${height}px).`)
      return
    }
    setForm((f) => ({ ...f, photoUrl: dataUrl }))
  }

  function removePhoto() {
    setForm((f) => ({ ...f, photoUrl: "" }))
    setPhotoError(undefined)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(undefined)
    setSaving(true)
    try {
      if (!form.name.trim() || !form.dietTags.length || !form.kcal || !form.protein || !form.carbs || !form.fat) {
        throw new Error("Fill in name, at least one diet tag, kcal, protein, carbs, and fat.")
      }
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        photoUrl: form.photoUrl || undefined,
        slot: form.slot,
        dietTags: form.dietTags,
        allergenTags: form.allergenTags,
        goalTags: form.goalTags,
        tier: form.tier,
        kcal: Number(form.kcal),
        protein: Number(form.protein),
        carbs: Number(form.carbs),
        fat: Number(form.fat),
      }
      if (editingItem) {
        await api.patch(`/menu-items/${editingItem.id}`, payload)
      } else {
        await api.post("/menu-items", payload)
      }
      await queryClient.invalidateQueries({ queryKey: ["menu-items"] })
      closeModal()
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
            onClick={openCreateModal}
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
                <MenuItemCard key={item.id} item={item} onEdit={openEditModal} onRequestDelete={setDeletingItem} />
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
              <h3 className="text-[18px] font-bold">{editingItem ? "Edit Menu Item" : "Add Menu Item"}</h3>
              <button onClick={closeModal} className="cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
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
                      {SLOT_LABELS[s] ?? s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Plan Type</label>
                <div className="flex gap-2">
                  {TIERS.map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, tier: t }))}
                      className={`px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
                        form.tier === t ? "bg-[#2E6B3E] text-white border-[#2E6B3E]" : "bg-white border-gray-300 text-gray-700"
                      }`}
                    >
                      {TIER_LABELS[t]}
                    </button>
                  ))}
                </div>
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
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Goal Tags</label>
                <div className="flex gap-2 flex-wrap">
                  {GOALS.map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => selectGoal(g)}
                      className={`px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
                        form.goalTags.includes(g) ? "bg-purple-600 text-white border-purple-600" : "bg-white border-gray-300 text-gray-700"
                      }`}
                    >
                      {GOAL_LABELS[g]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Allergen Tags</label>
                <div className="flex gap-2 flex-wrap">
                  {ALLERGENS.map((a) => (
                    <button
                      type="button"
                      key={a}
                      onClick={() => toggleAllergen(a)}
                      className={`px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
                        form.allergenTags.includes(a) ? "bg-amber-600 text-white border-amber-600" : "bg-white border-gray-300 text-gray-700"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Carbs (g)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full h-10 border border-gray-200 rounded-lg px-3"
                    value={form.carbs}
                    onChange={(e) => setForm((f) => ({ ...f, carbs: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Fat (g)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full h-10 border border-gray-200 rounded-lg px-3"
                    value={form.fat}
                    onChange={(e) => setForm((f) => ({ ...f, fat: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Photo</label>
                {form.photoUrl ? (
                  <div className="relative w-full">
                    <img src={form.photoUrl} alt="Menu item preview" className="w-full h-40 rounded-lg border border-gray-200 object-cover" />
                    <button
                      type="button"
                      onClick={removePhoto}
                      title="Remove photo"
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 text-status-red hover:bg-status-red hover:text-white flex items-center justify-center shadow-sm cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-1.5 w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer text-center hover:border-[#2E6B3E] hover:bg-green-50/40 transition-colors">
                    <span className="material-symbols-outlined text-[26px] text-gray-400">cloud_upload</span>
                    <span className="text-sm font-medium text-gray-700">Click to upload photo</span>
                    <span className="text-xs text-gray-400">
                      PNG or JPEG, exactly {REQUIRED_PHOTO_WIDTH}×{REQUIRED_PHOTO_HEIGHT}px
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </label>
                )}
                {photoError ? <p role="alert" className="text-sm text-status-red">{photoError}</p> : null}
              </div>
              {error ? <p role="alert" className="text-sm text-status-red">{error}</p> : null}
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-primary text-white rounded-lg font-semibold text-sm disabled:opacity-60 cursor-pointer"
                >
                  {saving ? "Saving..." : editingItem ? "Save Changes" : "Save Item"}
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
