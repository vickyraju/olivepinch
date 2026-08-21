import { Fragment, useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Header } from "@/components/header"
import { api, ApiError } from "@/lib/api"

interface MenuItem {
  id: string
  name: string
  slot: string
  date?: string
}

interface WeekSummary {
  weekStart: string
  published: boolean
  publishedAt: string | null
  itemCount: number
  complete: boolean
}

interface PendingEntry {
  subscriptionId: string
  customer: { id: string; fullName: string; email: string; phone: string | null; address: string | null }
  mealsPerDay: number
  missingDates: string[]
}

const SLOTS = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"]
const SLOTS_BY_MEALS_PER_DAY: Record<number, string[]> = {
  1: ["LUNCH"],
  2: ["BREAKFAST", "DINNER"],
  3: ["BREAKFAST", "LUNCH", "DINNER"],
}
// Every subscription needs one of these slots regardless of mealsPerDay — SNACKS is never
// required, so a week can publish without it. Mirrors isWeekComplete on the backend.
const REQUIRED_SLOTS = ["BREAKFAST", "LUNCH", "DINNER"]
const WEEKDAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

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

// The 7 calendar dates (ISO) making up the week that starts on this Monday.
function weekDatesFrom(mondayIso: string): string[] {
  if (!isMonday(mondayIso)) return []
  const start = new Date(`${mondayIso}T00:00:00.000Z`)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

function formatDayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00.000Z`)
  return `${WEEKDAY_LABELS[(d.getUTCDay() + 6) % 7]}, ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`
}

function formatDayShort(iso: string): { weekday: string; day: string } {
  const d = new Date(`${iso}T00:00:00.000Z`)
  return {
    weekday: WEEKDAY_LABELS[(d.getUTCDay() + 6) % 7]!.slice(0, 3),
    day: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
  }
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatWeekRange(mondayIso: string): string {
  const start = new Date(`${mondayIso}T00:00:00.000Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
  return `${fmt(start)} – ${fmt(end)}`
}

// A searchable multi-select for one meal slot — a flat wall of toggle buttons doesn't
// scale once a slot has dozens of items, so this filters as you type and shows picks as chips.
function SlotPicker({
  slot,
  items,
  dayItemIds,
  itemDateUsed,
  activeDay,
  onToggle,
}: {
  slot: string
  items: MenuItem[]
  dayItemIds: string[]
  itemDateUsed: Map<string, string>
  activeDay: string
  onToggle: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const selectedItems = items.filter((i) => dayItemIds.includes(i.id))
  const q = query.trim().toLowerCase()
  const matches = items.filter((i) => !dayItemIds.includes(i.id) && (!q || i.name.toLowerCase().includes(q)))

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => setOpen(true)}
        className="min-h-[42px] w-full border border-gray-200 rounded-lg px-2 py-1.5 flex flex-wrap items-center gap-1.5 cursor-text focus-within:ring-2 focus-within:ring-[#2E6B3E]/30 focus-within:border-[#2E6B3E]"
      >
        {selectedItems.map((item) => (
          <span key={item.id} className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-md bg-[#2E6B3E] text-white text-xs font-medium">
            {item.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggle(item.id)
              }}
              className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-white/20 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">close</span>
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={selectedItems.length ? "Add more…" : `Search ${slot.toLowerCase()} items…`}
          className="flex-1 min-w-[120px] text-xs outline-none py-1"
        />
      </div>

      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1">
          {matches.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">
              {items.length === 0 ? `No ${slot.toLowerCase()} items yet.` : "No matches."}
            </p>
          )}
          {matches.map((item) => {
            const usedOn = itemDateUsed.get(item.id)
            const usedElsewhere = usedOn !== undefined && usedOn !== activeDay
            return (
              <button
                key={item.id}
                type="button"
                disabled={usedElsewhere}
                onClick={() => {
                  onToggle(item.id)
                  setQuery("")
                }}
                title={usedElsewhere ? `Already used on ${formatDayLabel(usedOn!)}` : undefined}
                className={`w-full text-left px-3 py-1.5 text-xs ${
                  usedElsewhere ? "text-gray-300 cursor-not-allowed" : "text-gray-700 hover:bg-gray-50 cursor-pointer"
                }`}
              >
                {item.name}
                {usedElsewhere && <span className="text-gray-300"> · used on {formatDayLabel(usedOn!)}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
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
  const [composerItemsByDate, setComposerItemsByDate] = useState<Record<string, string[]>>({})
  const [composerPublished, setComposerPublished] = useState(false)
  const [composerError, setComposerError] = useState("")
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [activeDay, setActiveDay] = useState("")
  const [pendingExpanded, setPendingExpanded] = useState(false)

  const deepLinkWeek = searchParams.get("week")
  const pendingWeek = deepLinkWeek && isMonday(deepLinkWeek) ? deepLinkWeek : nextMondayIso()
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
      setComposerItemsByDate({})
      setComposerPublished(false)
      return
    }
    api
      .get<{ published: boolean; items: MenuItem[] }>(`/menu-weeks/${weekStart}`)
      .then((res) => {
        const byDate: Record<string, string[]> = {}
        for (const item of res.items) {
          if (!item.date) continue
          byDate[item.date] = [...(byDate[item.date] ?? []), item.id]
        }
        setComposerItemsByDate(byDate)
        setComposerPublished(res.published)
      })
      .catch(() => {
        setComposerItemsByDate({})
        setComposerPublished(false)
      })
  }

  useEffect(() => {
    loadComposerWeek(composerWeek)
    if (searchParams.get("subscriptionId")) setPendingExpanded(true)
    loadPending(pendingWeek)
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

  function toggleComposerItem(date: string, id: string) {
    setComposerItemsByDate((prev) => {
      const current = prev[date] ?? []
      return { ...prev, [date]: current.includes(id) ? current.filter((i) => i !== id) : [...current, id] }
    })
  }

  const composerDates = weekDatesFrom(composerWeek)
  const upcomingWeeks = [nextMondayIso(), addDays(nextMondayIso(), 7)]

  useEffect(() => {
    if (composerDates.length && !composerDates.includes(activeDay)) setActiveDay(composerDates[0]!)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composerWeek])

  // An item picked for one day can't also be picked for another — the week never repeats a dish.
  const itemDateUsed = new Map<string, string>()
  for (const [date, ids] of Object.entries(composerItemsByDate)) {
    for (const id of ids) itemDateUsed.set(id, date)
  }

  async function saveDraft() {
    if (!isMonday(composerWeek)) {
      setComposerError("Week must start on a Monday.")
      return
    }
    setSaving(true)
    setComposerError("")
    try {
      const dayItems = composerDates.map((date) => ({ date, menuItemIds: composerItemsByDate[date] ?? [] }))
      await api.put(`/menu-weeks/${composerWeek}`, { dayItems })
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
  const itemsById = new Map(allItems.map((item) => [item.id, item]))

  // Live completeness of whatever's currently in the composer (including unsaved edits) —
  // every day needs all required slots filled before the week can publish.
  const composerComplete =
    composerDates.length > 0 &&
    composerDates.every((date) => {
      const slotsPresent = new Set((composerItemsByDate[date] ?? []).map((id) => itemsById.get(id)?.slot))
      return REQUIRED_SLOTS.every((slot) => slotsPresent.has(slot))
    })

  // Keyed by "date:slot" — the override dropdowns only offer items actually published for that day.
  const pendingItemsByDateSlot = new Map<string, MenuItem[]>()
  for (const item of pendingWeekItems) {
    if (!item.date) continue
    const key = `${item.date}:${item.slot}`
    pendingItemsByDateSlot.set(key, [...(pendingItemsByDateSlot.get(key) ?? []), item])
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden ml-[260px]">
      <Header title="Weekly Menu" />
      <div className="flex-1 overflow-y-auto p-8">
        <p className="mb-6 text-sm text-gray-500">
          Set a different lineup for each day of the week — no dish repeats — then publish and cover anyone who
          hasn't chosen by the Tuesday 12AM UK cutoff.
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
                            w.published && w.complete
                              ? "bg-[#F0F7F3] text-[#2E6B3E] border-[#cfe6d7]"
                              : w.published
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-gray-50 text-gray-500 border-gray-200"
                          }`}
                        >
                          {w.published && w.complete ? "Published" : w.published ? "Incomplete" : "Draft"}
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
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {upcomingWeeks.map((weekStart, i) => {
                const active = weekStart === composerWeek
                return (
                  <button
                    key={weekStart}
                    type="button"
                    onClick={() => loadComposerWeek(weekStart)}
                    className={`px-4 py-2 rounded-lg border text-left cursor-pointer transition-colors ${
                      active ? "bg-[#2E6B3E] text-white border-[#2E6B3E]" : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{i === 0 ? "Upcoming week" : "Week after"}</span>
                    <span className={`block text-[10px] font-medium mt-0.5 ${active ? "text-white/80" : "text-gray-400"}`}>
                      {formatWeekRange(weekStart)}
                    </span>
                  </button>
                )
              })}
              {!upcomingWeeks.includes(composerWeek) && composerWeek && (
                <span className="px-3 py-2 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500">
                  Viewing {composerWeek}
                </span>
              )}
              {composerPublished && (
                <span
                  className={`px-2 py-1 rounded-full text-[10px] font-semibold border ${
                    composerComplete
                      ? "bg-[#F0F7F3] text-[#2E6B3E] border-[#cfe6d7]"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {composerComplete ? "Published" : "Incomplete"}
                </span>
              )}
            </div>

            {composerDates.length === 0 && (
              <p className="text-sm text-gray-400">Pick a week from the left to start composing.</p>
            )}

            {composerDates.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
                  {composerDates.map((date) => {
                    const count = (composerItemsByDate[date] ?? []).length
                    const active = date === activeDay
                    const { weekday, day } = formatDayShort(date)
                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => setActiveDay(date)}
                        className={`shrink-0 flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg border text-sm font-semibold transition-colors cursor-pointer ${
                          active
                            ? "bg-[#2E6B3E] text-white border-[#2E6B3E]"
                            : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <span>
                          {weekday} {day}
                        </span>
                        <span className={`text-[10px] font-medium ${active ? "text-white/80" : "text-gray-400"}`}>
                          {count === 0 ? "Empty" : `${count} item${count === 1 ? "" : "s"}`}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {activeDay && (
                  <div className="border border-gray-100 rounded-lg p-4">
                    <p className="text-sm font-bold text-gray-900 mb-3">{formatDayLabel(activeDay)}</p>
                    <div className="space-y-4">
                      {SLOTS.map((slot) => (
                        <div key={slot}>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{slot}</p>
                          <SlotPicker
                            slot={slot}
                            items={itemsBySlot.get(slot) ?? []}
                            dayItemIds={composerItemsByDate[activeDay] ?? []}
                            itemDateUsed={itemDateUsed}
                            activeDay={activeDay}
                            onToggle={(id) => toggleComposerItem(activeDay, id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

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
                disabled={publishing || (composerPublished && composerComplete) || !composerComplete || !isMonday(composerWeek)}
                title={!composerComplete ? "Every day needs breakfast, lunch, and dinner items before publishing" : undefined}
                className="px-4 py-2 bg-[#2E6B3E] text-white rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50"
              >
                {publishing ? "Publishing…" : composerPublished && composerComplete ? "Published" : "Publish"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[12px] border border-gray-200 mt-6 overflow-hidden">
          <button
            type="button"
            onClick={() => setPendingExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 cursor-pointer"
          >
            <span className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Customers who haven't chosen yet
              {pendingList && pendingList.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 normal-case tracking-normal">
                  {pendingList.length} pending
                </span>
              )}
            </span>
            <span className={`material-symbols-outlined text-gray-400 transition-transform ${pendingExpanded ? "rotate-180" : ""}`}>
              expand_more
            </span>
          </button>

          {pendingExpanded && (
            <div className="px-6 pb-6">
              <p className="text-xs text-gray-500 mb-4">
                Week of {formatWeekRange(pendingWeek)} — customers with a delivery that week who haven't picked yet.
              </p>

              {pendingList === null && <p className="text-sm text-gray-400">Loading…</p>}

              {pendingList && pendingList.length === 0 && (
            <p className="text-sm text-gray-400">Everyone with a delivery that week has already chosen.</p>
          )}

          {pendingList && pendingList.length > 0 && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Phone</th>
                  <th className="pb-2 pr-4">Address</th>
                  <th className="pb-2 pr-4">Missing</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingList.map((entry) => (
                  <Fragment key={entry.subscriptionId}>
                    <tr id={`pending-${entry.subscriptionId}`} className="scroll-mt-4">
                      <td className="py-3 pr-4 font-semibold text-gray-900">{entry.customer.fullName}</td>
                      <td className="py-3 pr-4 text-gray-600">{entry.customer.phone ?? "—"}</td>
                      <td className="py-3 pr-4 text-gray-600">{entry.customer.address ?? entry.customer.email}</td>
                      <td className="py-3 pr-4 text-gray-600">
                        {entry.missingDates.length} day{entry.missingDates.length === 1 ? "" : "s"}
                      </td>
                      <td className="py-3 text-right">
                        {overridingId !== entry.subscriptionId && (
                          <button
                            type="button"
                            onClick={() => startOverride(entry)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Set menu
                          </button>
                        )}
                      </td>
                    </tr>
                    {overridingId === entry.subscriptionId && (
                      <tr>
                        <td colSpan={5} className="pb-4">
                          <div className="space-y-3 rounded-lg border border-gray-200 p-4">
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
                                        {(pendingItemsByDateSlot.get(`${date}:${slot}`) ?? []).map((item) => (
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
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MenuWeeks
