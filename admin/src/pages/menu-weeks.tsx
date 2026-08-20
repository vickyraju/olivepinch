import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Header } from "@/components/header"
import { api, ApiError } from "@/lib/api"

interface MenuItem {
  id: string
  name: string
  slot: string
}

interface WeekSummary {
  weekStart: string
  published: boolean
  publishedAt: string | null
  itemCount: number
}

interface PendingEntry {
  subscriptionId: string
  customer: { id: string; fullName: string; email: string; phone: string | null; address: string | null }
  mealsPerDay: number
  missingDates: string[]
}

const SLOTS = ["BREAKFAST", "LUNCH", "DINNER"]
const SLOTS_BY_MEALS_PER_DAY: Record<number, string[]> = {
  1: ["LUNCH"],
  2: ["BREAKFAST", "DINNER"],
  3: ["BREAKFAST", "LUNCH", "DINNER"],
}

function isMonday(iso: string): boolean {
  if (!iso) return false
  const d = new Date(`${iso}T00:00:00.000Z`)
  return d.getUTCDay() === 1
}

function nextMondayIso(): string {
  const d = new Date()
  const day = d.getUTCDay()
  const daysUntilMonday = day === 1 ? 7 : ((8 - day) % 7)
  d.setUTCDate(d.getUTCDate() + (daysUntilMonday || 7))
  return d.toISOString().slice(0, 10)
}

function MenuWeeks() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const deepLinkHandled = useRef(false)

  const weeksQuery = useQuery({ queryKey: ["menu-weeks"], queryFn: () => api.get<WeekSummary[]>("/menu-weeks") })
  const itemsQuery = useQuery({ queryKey: ["menu-items"], queryFn: () => api.get<MenuItem[]>("/menu-items") })
  const allItems = itemsQuery.data ?? []
  const weeks = weeksQuery.data ?? []

  const [composerWeek, setComposerWeek] = useState(nextMondayIso())
  const [composerItems, setComposerItems] = useState<string[]>([])
  const [composerPublished, setComposerPublished] = useState(false)
  const [composerError, setComposerError] = useState("")
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const deepLinkWeek = searchParams.get("week")
  const [pendingWeek, setPendingWeek] = useState(deepLinkWeek && isMonday(deepLinkWeek) ? deepLinkWeek : nextMondayIso())
  const [pendingList, setPendingList] = useState<PendingEntry[] | null>(null)
  const [pendingWeekItems, setPendingWeekItems] = useState<MenuItem[]>([])
  const [overridingId, setOverridingId] = useState<string | null>(null)
  const [overrideSelections, setOverrideSelections] = useState<Record<string, string[]>>({})
  const [overrideError, setOverrideError] = useState("")
  const [overrideSaving, setOverrideSaving] = useState(false)

  function loadComposerWeek(weekStart: string) {
    setComposerWeek(weekStart)
    setComposerError("")
    if (!isMonday(weekStart)) {
      setComposerItems([])
      setComposerPublished(false)
      return
    }
    api
      .get<{ published: boolean; items: MenuItem[] }>(`/menu-weeks/${weekStart}`)
      .then((res) => {
        setComposerItems(res.items.map((i) => i.id))
        setComposerPublished(res.published)
      })
      .catch(() => {
        setComposerItems([])
        setComposerPublished(false)
      })
  }

  useEffect(() => {
    loadComposerWeek(composerWeek)
    if (searchParams.get("subscriptionId")) loadPending(pendingWeek)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Deep-linked from the dashboard's "Choose menu" button — auto-open the matching
  // customer's override form once the pending list arrives.
  useEffect(() => {
    if (deepLinkHandled.current || !pendingList) return
    deepLinkHandled.current = true
    const subscriptionId = searchParams.get("subscriptionId")
    const entry = pendingList.find((e) => e.subscriptionId === subscriptionId)
    if (entry) {
      startOverride(entry)
      document.getElementById(`pending-${entry.subscriptionId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingList])

  function toggleComposerItem(id: string) {
    setComposerItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  async function saveDraft() {
    if (!isMonday(composerWeek)) {
      setComposerError("Week must start on a Monday.")
      return
    }
    setSaving(true)
    setComposerError("")
    try {
      await api.put(`/menu-weeks/${composerWeek}`, { menuItemIds: composerItems })
      await queryClient.invalidateQueries({ queryKey: ["menu-weeks"] })
    } catch (err) {
      setComposerError(err instanceof ApiError ? err.message : "Couldn't save this week's menu.")
    } finally {
      setSaving(false)
    }
  }

  async function publish() {
    setPublishing(true)
    setComposerError("")
    try {
      await api.post(`/menu-weeks/${composerWeek}/publish`)
      setComposerPublished(true)
      await queryClient.invalidateQueries({ queryKey: ["menu-weeks"] })
    } catch (err) {
      setComposerError(err instanceof ApiError ? err.message : "Couldn't publish this week's menu.")
    } finally {
      setPublishing(false)
    }
  }

  async function loadPending(weekStart: string = pendingWeek) {
    setOverridingId(null)
    setPendingList(null)
    const [list, week] = await Promise.all([
      api.get<PendingEntry[]>(`/menu-weeks/${weekStart}/pending`),
      api.get<{ items: MenuItem[] }>(`/menu-weeks/${weekStart}`),
    ])
    setPendingList(list)
    setPendingWeekItems(week.items)
  }

  function startOverride(entry: PendingEntry) {
    setOverridingId(entry.subscriptionId)
    setOverrideError("")
    const slots = SLOTS_BY_MEALS_PER_DAY[entry.mealsPerDay] ?? []
    const initial: Record<string, string[]> = {}
    for (const date of entry.missingDates) initial[date] = new Array(slots.length).fill("")
    setOverrideSelections(initial)
  }

  function setOverrideItem(date: string, slotIndex: number, itemId: string) {
    setOverrideSelections((prev) => {
      const next = [...(prev[date] ?? [])]
      next[slotIndex] = itemId
      return { ...prev, [date]: next }
    })
  }

  async function saveOverride(entry: PendingEntry) {
    setOverrideSaving(true)
    setOverrideError("")
    try {
      const dayItems = entry.missingDates.map((date) => ({ date, items: overrideSelections[date] ?? [] }))
      await api.patch(`/menu-weeks/${pendingWeek}/subscriptions/${entry.subscriptionId}`, { dayItems })
      setOverridingId(null)
      await loadPending()
    } catch (err) {
      setOverrideError(err instanceof ApiError ? err.message : "Couldn't save this customer's menu.")
    } finally {
      setOverrideSaving(false)
    }
  }

  const itemsBySlot = new Map<string, MenuItem[]>()
  for (const item of allItems) itemsBySlot.set(item.slot, [...(itemsBySlot.get(item.slot) ?? []), item])

  const pendingItemsBySlot = new Map<string, MenuItem[]>()
  for (const item of pendingWeekItems) pendingItemsBySlot.set(item.slot, [...(pendingItemsBySlot.get(item.slot) ?? []), item])

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden ml-[260px]">
      <Header title="Weekly Menu" />
      <div className="flex-1 overflow-y-auto p-8">
        <p className="mb-6 text-sm text-gray-500">
          Publish next week's available items and cover anyone who hasn't chosen by the Friday cutoff.
        </p>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden h-fit">
            <div className="px-5 py-3 border-b border-gray-200">
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Weeks</h3>
            </div>
            {weeks.length === 0 ? (
              <p className="p-5 text-sm text-gray-400">No weeks composed yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {weeks.map((w) => (
                  <li key={w.weekStart}>
                    <button
                      type="button"
                      onClick={() => loadComposerWeek(w.weekStart)}
                      className={`w-full text-left px-5 py-3 text-sm cursor-pointer hover:bg-gray-50 ${
                        w.weekStart === composerWeek ? "bg-[#F0F7F3]" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-900">{w.weekStart}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                            w.published
                              ? "bg-[#F0F7F3] text-[#2E6B3E] border-[#cfe6d7]"
                              : "bg-gray-50 text-gray-500 border-gray-200"
                          }`}
                        >
                          {w.published ? "Published" : "Draft"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {w.itemCount} item{w.itemCount === 1 ? "" : "s"}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-[12px] border border-gray-200 p-6">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-4">Compose a week</h3>
            <div className="flex items-end gap-3 mb-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Week start (Monday)
                </label>
                <input
                  type="date"
                  value={composerWeek}
                  onChange={(e) => loadComposerWeek(e.target.value)}
                  className="h-10 border border-gray-200 rounded-lg px-3 text-sm"
                />
              </div>
              {composerPublished && (
                <span className="mb-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-[#F0F7F3] text-[#2E6B3E] border-[#cfe6d7]">
                  Published
                </span>
              )}
            </div>

            {!isMonday(composerWeek) && composerWeek && (
              <p className="text-sm text-status-red mb-4">Pick a Monday — weeks always start on a Monday.</p>
            )}

            <div className="space-y-4">
              {SLOTS.map((slot) => (
                <div key={slot}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{slot}</p>
                  <div className="flex gap-2 flex-wrap">
                    {(itemsBySlot.get(slot) ?? []).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleComposerItem(item.id)}
                        className={`px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
                          composerItems.includes(item.id)
                            ? "bg-[#2E6B3E] text-white border-[#2E6B3E]"
                            : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
                        }`}
                      >
                        {item.name}
                      </button>
                    ))}
                    {(itemsBySlot.get(slot) ?? []).length === 0 && (
                      <span className="text-xs text-gray-400">No {slot.toLowerCase()} items yet.</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {composerError && (
              <p role="alert" className="mt-4 text-sm text-status-red">
                {composerError}
              </p>
            )}

            <div className="flex gap-3 pt-5">
              <button
                type="button"
                onClick={saveDraft}
                disabled={saving || !isMonday(composerWeek)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save draft"}
              </button>
              <button
                type="button"
                onClick={publish}
                disabled={publishing || composerPublished || composerItems.length === 0 || !isMonday(composerWeek)}
                className="px-4 py-2 bg-[#2E6B3E] text-white rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50"
              >
                {publishing ? "Publishing…" : composerPublished ? "Published" : "Publish"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[12px] border border-gray-200 p-6 mt-6">
          <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Customers who haven't chosen yet
          </h3>
          <div className="flex items-end gap-3 mb-5">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Week start (Monday)
              </label>
              <input
                type="date"
                value={pendingWeek}
                onChange={(e) => setPendingWeek(e.target.value)}
                className="h-10 border border-gray-200 rounded-lg px-3 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => loadPending()}
              disabled={!isMonday(pendingWeek)}
              className="h-10 px-4 border border-gray-300 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50"
            >
              Load
            </button>
          </div>

          {pendingList && pendingList.length === 0 && (
            <p className="text-sm text-gray-400">Everyone with a delivery that week has already chosen.</p>
          )}

          {pendingList && pendingList.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {pendingList.map((entry) => (
                <li key={entry.subscriptionId} id={`pending-${entry.subscriptionId}`} className="py-4 scroll-mt-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{entry.customer.fullName}</p>
                      <p className="text-xs text-gray-500">
                        {[entry.customer.phone, entry.customer.address ?? entry.customer.email].filter(Boolean).join(" · ")}
                        {" · missing "}
                        {entry.missingDates.length} day{entry.missingDates.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    {overridingId !== entry.subscriptionId && (
                      <button
                        type="button"
                        onClick={() => startOverride(entry)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Set menu
                      </button>
                    )}
                  </div>

                  {overridingId === entry.subscriptionId && (
                    <div className="mt-3 space-y-3 rounded-lg border border-gray-200 p-4">
                      {entry.missingDates.map((date) => {
                        const slots = SLOTS_BY_MEALS_PER_DAY[entry.mealsPerDay] ?? []
                        return (
                          <div key={date}>
                            <p className="text-xs font-semibold text-gray-500 mb-1.5">{date}</p>
                            <div className="grid grid-cols-3 gap-2">
                              {slots.map((slot, i) => (
                                <select
                                  key={slot}
                                  value={overrideSelections[date]?.[i] ?? ""}
                                  onChange={(e) => setOverrideItem(date, i, e.target.value)}
                                  className="h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900"
                                >
                                  <option value="">{slot}…</option>
                                  {(pendingItemsBySlot.get(slot) ?? []).map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name}
                                    </option>
                                  ))}
                                </select>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                      {overrideError && (
                        <p role="alert" className="text-sm text-status-red">
                          {overrideError}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={overrideSaving}
                          onClick={() => saveOverride(entry)}
                          className="px-3 py-1.5 bg-[#2E6B3E] text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                        >
                          {overrideSaving ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setOverridingId(null)}
                          disabled={overrideSaving}
                          className="px-3 py-1.5 text-gray-500 text-xs font-semibold cursor-pointer disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default MenuWeeks
