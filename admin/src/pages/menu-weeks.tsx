import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { api, ApiError } from "@/lib/api"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { nextMondayIso } from "@/lib/dates"

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

function MenuWeeks() {
  const [searchParams] = useSearchParams()
  const deepLinkHandled = useRef(false)
  const [weeks, setWeeks] = useState<WeekSummary[]>([])
  const [allItems, setAllItems] = useState<MenuItem[]>([])

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

  function loadWeeks() {
    api.get<WeekSummary[]>("/menu-weeks").then(setWeeks)
  }

  useEffect(() => {
    loadWeeks()
    api.get<MenuItem[]>("/menu-items").then(setAllItems)
    loadComposerWeek(composerWeek)
    if (searchParams.get("subscriptionId")) loadPending(pendingWeek)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Deep-linked from the dashboard's "Choose menu" button — auto-open the matching
  // customer's override form and scroll to it once the pending list arrives. Guarded by
  // a ref so re-loading the list after a save doesn't keep re-triggering this.
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
      loadWeeks()
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
      loadWeeks()
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
      loadPending()
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
    <div className="space-y-6">
      <PageHeader title="Weekly Menu" description="Publish next week's available items and cover anyone who hasn't chosen by the Friday cutoff." />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader><CardTitle>Weeks</CardTitle></CardHeader>
          <CardContent className="p-0">
            {weeks.length === 0 ? (
              <p className="p-5 text-sm text-ink-muted">No weeks composed yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {weeks.map((w) => (
                  <li key={w.weekStart}>
                    <button
                      onClick={() => loadComposerWeek(w.weekStart)}
                      className={`w-full text-left px-5 py-3 text-sm cursor-pointer hover:bg-canvas ${w.weekStart === composerWeek ? "bg-olive-50" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-ink">{w.weekStart}</span>
                        <Badge className={w.published ? "bg-olive-50 text-olive-700 border-olive-100" : "bg-canvas text-ink-muted border-border"}>
                          {w.published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <div className="text-xs text-ink-muted mt-0.5">{w.itemCount} item{w.itemCount === 1 ? "" : "s"}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Compose a week</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div>
                <Label htmlFor="week-start">Week start (Monday)</Label>
                <Input id="week-start" type="date" value={composerWeek} onChange={(e) => loadComposerWeek(e.target.value)} />
              </div>
              {composerPublished && <Badge className="bg-olive-50 text-olive-700 border-olive-100 mb-2">Published</Badge>}
            </div>

            {!isMonday(composerWeek) && composerWeek && (
              <p className="text-sm text-destructive">Pick a Monday — weeks always start on a Monday.</p>
            )}

            {["BREAKFAST", "LUNCH", "DINNER"].map((slot) => (
              <div key={slot}>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">{slot}</p>
                <div className="flex gap-2 flex-wrap">
                  {(itemsBySlot.get(slot) ?? []).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleComposerItem(item.id)}
                      className={`px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer ${
                        composerItems.includes(item.id) ? "bg-olive-600 text-white border-olive-600" : "bg-surface border-border text-ink"
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {composerError && <p role="alert" className="text-sm text-destructive">{composerError}</p>}

            <div className="flex gap-2 pt-2">
              <Button onClick={saveDraft} disabled={saving || !isMonday(composerWeek)}>
                {saving ? "Saving…" : "Save draft"}
              </Button>
              <Button
                variant="ghost"
                onClick={publish}
                disabled={publishing || composerPublished || composerItems.length === 0 || !isMonday(composerWeek)}
              >
                {publishing ? "Publishing…" : composerPublished ? "Published" : "Publish"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Customers who haven't chosen yet</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div>
              <Label htmlFor="pending-week">Week start (Monday)</Label>
              <Input id="pending-week" type="date" value={pendingWeek} onChange={(e) => setPendingWeek(e.target.value)} />
            </div>
            <Button onClick={() => loadPending()} disabled={!isMonday(pendingWeek)}>Load</Button>
          </div>

          {pendingList && pendingList.length === 0 && <p className="text-sm text-ink-muted">Everyone with a delivery that week has already chosen.</p>}

          {pendingList && pendingList.length > 0 && (
            <ul className="divide-y divide-border">
              {pendingList.map((entry) => (
                <li key={entry.subscriptionId} id={`pending-${entry.subscriptionId}`} className="py-3 scroll-mt-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-medium text-ink">{entry.customer.fullName}</p>
                      <p className="text-xs text-ink-muted">
                        {[entry.customer.phone, entry.customer.address ?? entry.customer.email].filter(Boolean).join(" · ")} · missing {entry.missingDates.length} day{entry.missingDates.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    {overridingId !== entry.subscriptionId && (
                      <Button size="sm" variant="outline" onClick={() => startOverride(entry)}>Set menu</Button>
                    )}
                  </div>

                  {overridingId === entry.subscriptionId && (
                    <div className="mt-3 space-y-3 rounded-md border border-border p-4">
                      {entry.missingDates.map((date) => {
                        const slots = SLOTS_BY_MEALS_PER_DAY[entry.mealsPerDay] ?? []
                        return (
                          <div key={date}>
                            <p className="text-xs font-semibold text-ink-muted mb-1.5">{date}</p>
                            <div className="grid grid-cols-3 gap-2">
                              {slots.map((slot, i) => (
                                <select
                                  key={slot}
                                  value={overrideSelections[date]?.[i] ?? ""}
                                  onChange={(e) => setOverrideItem(date, i, e.target.value)}
                                  className="flex h-9 w-full rounded-sm border border-border bg-surface px-2 text-xs text-ink"
                                >
                                  <option value="">{slot}…</option>
                                  {(pendingItemsBySlot.get(slot) ?? []).map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                  ))}
                                </select>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                      {overrideError && <p role="alert" className="text-sm text-destructive">{overrideError}</p>}
                      <div className="flex gap-2">
                        <Button size="sm" disabled={overrideSaving} onClick={() => saveOverride(entry)}>
                          {overrideSaving ? "Saving…" : "Save"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setOverridingId(null)} disabled={overrideSaving}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default MenuWeeks
