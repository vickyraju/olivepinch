import { useEffect, useState } from "react"
import { CalendarRange, Sparkles, CheckCircle2 } from "lucide-react"
import { useDashboard } from "@/lib/dashboard-context"
import { SLOTS_BY_MEALS_PER_DAY } from "@/data/menu"
import { mondayOf, addWeeks, toDateKey, fromDateKey } from "@/lib/subscription"
import { mealSlotFromEnum } from "@/lib/enum-map"
import { api, ApiError } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface PublishedMenuItem {
  id: string
  name: string
  slot: string // raw backend enum, e.g. "BREAKFAST"
}

function WeeklyMenu() {
  const { customer, chooseMenuWeek } = useDashboard()
  const sub = customer.subscription
  const today = toDateKey(new Date())
  const thisMonday = mondayOf(today)
  const nextMonday = addWeeks(thisMonday, 1)
  const wednesdayThisWeek = toDateKey((() => {
    const d = fromDateKey(thisMonday)
    d.setDate(d.getDate() + 2)
    return d
  })())
  const cutoff = toDateKey((() => {
    const d = fromDateKey(nextMonday)
    d.setDate(d.getDate() - 2)
    return d
  })())

  const [nextWeekItems, setNextWeekItems] = useState<PublishedMenuItem[] | null | "loading" | "unpublished">("loading")
  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  const slots = SLOTS_BY_MEALS_PER_DAY[sub.mealsPerDay]
  const inRange = (date: string, start: string) => date >= start && date < addWeeks(start, 1)
  const thisWeekOrders = sub.orders.filter((o) => inRange(o.date, thisMonday))
  const nextWeekOrders = sub.orders.filter((o) => inRange(o.date, nextMonday))
  const needsChoice = nextWeekOrders.some((o) => !o.menuChosenAt)
  const cutoffPassed = today >= cutoff
  const showBanner = today >= wednesdayThisWeek && needsChoice && !cutoffPassed && nextWeekOrders.length > 0

  useEffect(() => {
    if (nextWeekOrders.length === 0) return
    api
      .get<{ weekStart: string; items: PublishedMenuItem[] }>(`/menu-weeks/${nextMonday}`)
      .then((res) => {
        setNextWeekItems(res.items)
        // Pre-fill from whatever's currently assigned (defaults, until the customer changes them).
        const initial: Record<string, string[]> = {}
        for (const order of nextWeekOrders) initial[order.date] = order.items.map((i) => i.id)
        setSelections(initial)
      })
      .catch((err) => setNextWeekItems(err instanceof ApiError && err.status === 404 ? "unpublished" : null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextMonday])

  function setItem(date: string, slotIndex: number, itemId: string) {
    setSelections((prev) => {
      const current = prev[date] ?? []
      const next = [...current]
      next[slotIndex] = itemId
      return { ...prev, [date]: next }
    })
  }

  async function handleSave() {
    setSaving(true)
    setError("")
    setSaved(false)
    const dayItems = nextWeekOrders.map((o) => ({ date: o.date, items: selections[o.date] ?? [] }))
    const result = await chooseMenuWeek(nextMonday, dayItems)
    setSaving(false)
    if (result.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 5000)
    } else {
      setError(result.reason ?? "Couldn't save your choices — try again.")
    }
  }

  const optionsBySlot = new Map<string, PublishedMenuItem[]>()
  if (Array.isArray(nextWeekItems)) {
    for (const item of nextWeekItems) {
      const label = mealSlotFromEnum(item.slot)
      optionsBySlot.set(label, [...(optionsBySlot.get(label) ?? []), item])
    }
  }

  const canSave = nextWeekOrders.every((o) => (selections[o.date] ?? []).filter(Boolean).length === slots.length)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl text-ink mb-1">Weekly Menu</h1>
        <p className="text-ink-muted">See what's coming this week, and pick what you'd like next week.</p>
      </div>

      {showBanner && (
        <div role="alert" className="rounded-lg bg-coral-50 p-4 flex items-start gap-3">
          <CalendarRange className="h-5 w-5 text-coral-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-coral-600">Next week's menu is ready for you to choose</p>
            <p className="text-sm text-ink-muted mt-0.5">
              Pick your meals below before Friday night — after that we'll go with what's already set.
            </p>
          </div>
        </div>
      )}

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg text-ink mb-4">This week's menu</h2>
        {thisWeekOrders.length === 0 ? (
          <p className="text-sm text-ink-muted">No deliveries scheduled this week.</p>
        ) : (
          <div className="space-y-3">
            {thisWeekOrders.map((day) => (
              <div key={day.id} className="flex items-center justify-between border-b border-border last:border-0 pb-3 last:pb-0">
                <span className="text-sm font-medium text-ink">
                  {new Date(day.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                </span>
                <span className="text-xs text-ink-muted text-right">{day.items.map((i) => `${i.slot}: ${i.name}`).join(" · ")}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg text-ink mb-1">Next week's menu</h2>

        {nextWeekOrders.length === 0 && <p className="text-sm text-ink-muted mt-3">Your plan doesn't run into next week.</p>}

        {nextWeekOrders.length > 0 && nextWeekItems === "loading" && <p className="text-sm text-ink-muted mt-3">Loading…</p>}

        {nextWeekOrders.length > 0 && nextWeekItems === "unpublished" && (
          <p className="text-sm text-ink-muted mt-3">Next week's menu hasn't been published yet — check back soon.</p>
        )}

        {nextWeekOrders.length > 0 && nextWeekItems === null && (
          <p className="text-sm text-coral-600 mt-3">Couldn't load next week's menu — try refreshing.</p>
        )}

        {nextWeekOrders.length > 0 && Array.isArray(nextWeekItems) && cutoffPassed && (
          <p className="text-sm text-ink-muted mt-3">
            The selection window for next week has closed. If you'd like a change, contact us and we'll sort it out.
          </p>
        )}

        {nextWeekOrders.length > 0 && Array.isArray(nextWeekItems) && !cutoffPassed && (
          <>
            <p className="text-sm text-ink-muted mb-4 mt-1">Choose by Friday night — otherwise we'll keep what's already set below.</p>
            <Accordion type="single" collapsible className="rounded-xl border border-border px-6">
              {nextWeekOrders.map((day) => (
                <AccordionItem key={day.id} value={day.date}>
                  <AccordionTrigger>
                    {new Date(day.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {slots.map((slot, slotIndex) => {
                        const options = optionsBySlot.get(slot) ?? []
                        const value = selections[day.date]?.[slotIndex]
                        return (
                          <div key={slot}>
                            <span className="text-xs font-semibold text-coral-600">{slot}</span>
                            <Select value={value} onValueChange={(v) => setItem(day.date, slotIndex, v)}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Choose…" />
                              </SelectTrigger>
                              <SelectContent>
                                {options.map((opt) => (
                                  <SelectItem key={opt.id} value={opt.id}>
                                    {opt.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {error && <p className="text-sm text-coral-600 mt-4">{error}</p>}
            {saved && (
              <div role="status" className="mt-4 flex items-center gap-2 text-sm font-medium text-olive-700">
                <CheckCircle2 className="h-4 w-4" /> Saved — next week's menu is set.
              </div>
            )}

            <Button type="button" variant="primary" className="mt-4" disabled={!canSave || saving} onClick={handleSave}>
              <Sparkles className="h-4 w-4" />
              {saving ? "Saving…" : "Save my choices"}
            </Button>
          </>
        )}
      </Card>
    </div>
  )
}

export default WeeklyMenu
