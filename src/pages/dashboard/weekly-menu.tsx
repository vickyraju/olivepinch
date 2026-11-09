import { useEffect, useState } from "react"
import { CalendarRange, Sparkles, CheckCircle2 } from "lucide-react"
import { useDashboard, type OrderDay } from "@/lib/dashboard-context"
import { SLOTS_BY_MEALS_PER_DAY } from "@/data/menu"
import { mondayOf, addWeeks, toDateKey, fromDateKey, canPauseDate } from "@/lib/subscription"
import { mealSlotFromEnum, DIET_TO_ENUM } from "@/lib/enum-map"
import { api, ApiError } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { FoodPhoto } from "@/components/ui/food-photo"
import { Badge } from "@/components/ui/badge"
import type { PublishedMenuItem } from "@/types/menu"
import { preloadImages } from "@/lib/preload-images"
import { scrollToFirstInvalid } from "@/lib/invalid"
import { optionsForBox, type MenuOption } from "@/lib/menu-options"

type WeekItems = PublishedMenuItem[] | null | "loading" | "unpublished"

const dayLabel = (date: string) => new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })

// Loads a week's published menu while `enabled` (a week with no days to choose isn't fetched).
function useWeekMenu(weekStart: string, enabled: boolean): WeekItems {
  const [items, setItems] = useState<WeekItems>("loading")
  useEffect(() => {
    if (!enabled) return
    api
      .get<{ weekStart: string; items: PublishedMenuItem[] }>(`/menu-weeks/${weekStart}`)
      .then((res) => setItems(res.items))
      .catch((err) => setItems(err instanceof ApiError && err.status === 404 ? "unpublished" : null))
  }, [weekStart, enabled])
  // Warm the photos so the pickers open with images already loaded.
  useEffect(() => {
    if (Array.isArray(items)) preloadImages(items.map((item) => item.photoUrl))
  }, [items])
  return items
}

// Meal pickers for a set of days in one week, with one Save for all of them.
function DayPickers({
  weekStart,
  days,
  items,
  savedText,
}: {
  weekStart: string
  days: OrderDay[]
  items: PublishedMenuItem[]
  savedText: string
}) {
  const { customer, chooseMenuWeek } = useDashboard()
  const sub = customer.subscription
  // Days still coming from the plan this one renewed sit alongside this plan's own days. They have
  // their own meals per day (a renewal can change it), so the boxes to fill depend on the day.
  const slotsFor = (day: OrderDay) =>
    SLOTS_BY_MEALS_PER_DAY[day.fromPreviousPlan ? (sub.earlierMealsPerDay ?? sub.mealsPerDay) : sub.mealsPerDay]

  // Pre-fill from whatever's currently assigned (empty until the customer chooses), aligned to the box
  // order: a day with only some boxes filled must not shift a dinner into the breakfast box.
  const [selections, setSelections] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(days.map((d) => [d.date, slotsFor(d).map((slot) => d.items.find((i) => i.slot === slot)?.id ?? "")]))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  // Set once Save is tapped with a day unfinished: its empty boxes turn red and the first such day opens.
  const [tried, setTried] = useState(false)
  const [openDay, setOpenDay] = useState("")

  // Keyed by date + slot: the admin composes each day separately, so a day only offers its own items.
  // Only meals of the customer's tier that fit their food types and avoid their allergens, as at signup.
  const dietEnums = new Set(sub.dietTypes.map((d) => DIET_TO_ENUM[d]))
  const avoided = new Set(sub.allergens)
  const byDateSlot = new Map<string, PublishedMenuItem[]>()
  for (const item of items) {
    const key = `${item.date}|${mealSlotFromEnum(item.slot)}`
    byDateSlot.set(key, [...(byDateSlot.get(key) ?? []), item])
  }
  const optionsByDateSlot = new Map<string, MenuOption[]>(
    [...byDateSlot].map(([key, list]) => [key, optionsForBox(list, sub.tier, dietEnums, avoided)])
  )

  // Boxes with no options at all do not need a pick.
  const isDone = (o: OrderDay) => slotsFor(o).every((slot, i) => (optionsByDateSlot.get(`${o.date}|${slot}`) ?? []).length === 0 || Boolean(selections[o.date]?.[i]))

  function setItem(date: string, slotIndex: number, itemId: string) {
    setSelections((prev) => {
      const next = [...(prev[date] ?? [])]
      next[slotIndex] = itemId
      return { ...prev, [date]: next }
    })
  }

  async function handleSave() {
    if (!days.every(isDone)) {
      setTried(true)
      setOpenDay(days.find((o) => !isDone(o))?.date ?? "")
      scrollToFirstInvalid()
      return
    }
    setSaving(true)
    setError("")
    setSaved(false)
    // A box with nothing to choose goes to the server as "", which it only accepts when truly nothing fits.
    const dayItems = days.map((o) => ({ date: o.date, items: slotsFor(o).map((_slot, i) => selections[o.date]?.[i] ?? "") }))
    const result = await chooseMenuWeek(weekStart, dayItems)
    setSaving(false)
    if (result.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 5000)
    } else {
      setError(result.reason ?? "Couldn't save your choices — try again.")
    }
  }

  return (
    <>
      <Accordion type="single" collapsible value={openDay} onValueChange={setOpenDay} className="rounded-xl border border-border px-6">
        {days.map((day) => (
          <AccordionItem key={day.id} value={day.date}>
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                {dayLabel(day.date)}
                {!isDone(day) && <span className="text-xs font-normal text-coral-600">· Choose your meals</span>}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {slotsFor(day).map((slot, slotIndex) => {
                  const options = optionsByDateSlot.get(`${day.date}|${slot}`) ?? []
                  const value = selections[day.date]?.[slotIndex] || undefined
                  const chosen = options.find((opt) => opt.id === value)
                  return (
                    <div key={slot}>
                      <span className="text-xs font-semibold text-coral-600">{slot}</span>
                      {options.length === 0 ? (
                        <p className="mt-1 rounded-lg border border-dashed border-border bg-cream-100 px-3 py-2.5 text-sm text-ink-muted">
                          No meals have been set for this box on this day yet — check back once the menu is updated.
                        </p>
                      ) : (
                        <>
                          <Select value={value} onValueChange={(v) => setItem(day.date, slotIndex, v)}>
                            <SelectTrigger className="mt-1" aria-invalid={tried && !value}>
                              <SelectValue placeholder="Choose…" />
                            </SelectTrigger>
                            <SelectContent>
                              {options.map((opt) => (
                                <SelectItem key={opt.id} value={opt.id}>
                                  <span className="flex items-center gap-2">
                                    <FoodPhoto eager src={opt.photoUrl ?? undefined} alt={opt.name} className="h-8 w-8 shrink-0" />
                                    <span className="min-w-0 truncate">{opt.name}</span>
                                    {opt.outsideFoodTypes && <span className="shrink-0 text-xs text-ink-muted">· outside your food types</span>}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {chosen && (
                            <div className="mt-2 rounded-lg border border-border overflow-hidden">
                              <FoodPhoto eager src={chosen.photoUrl ?? undefined} alt={chosen.name} className="aspect-[16/9] rounded-none" />
                              <p className="px-3 pt-2.5 text-sm font-medium text-ink">{chosen.name}</p>
                              <div className="p-2 flex gap-1 flex-wrap">
                                <Badge variant="olive">{chosen.kcal} kcal</Badge>
                                <Badge variant="coral">{chosen.protein}g protein</Badge>
                                <Badge variant="neutral">{chosen.carbs}g carbs</Badge>
                                <Badge variant="neutral">{chosen.fat}g fat</Badge>
                              </div>
                            </div>
                          )}
                        </>
                      )}
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
          <CheckCircle2 className="h-4 w-4" /> {savedText}
        </div>
      )}

      <Button type="button" variant="primary" className="mt-4" disabled={saving} onClick={handleSave}>
        <Sparkles className="h-4 w-4" />
        {saving ? "Saving…" : "Save my choices"}
      </Button>
    </>
  )
}

function WeeklyMenu() {
  const { customer } = useDashboard()
  const sub = customer.subscription
  const today = toDateKey(new Date())
  const thisMonday = mondayOf(today)
  const nextMonday = addWeeks(thisMonday, 1)
  const wednesdayThisWeek = toDateKey((() => {
    const d = fromDateKey(thisMonday)
    d.setDate(d.getDate() + 2)
    return d
  })())
  // Saturday 12AM UK, the week the menu is served — mirrors fridayCutoffFor on the backend.
  const cutoff = toDateKey((() => {
    const d = fromDateKey(nextMonday)
    d.setDate(d.getDate() + 5)
    return d
  })())

  const allOrders = [...sub.earlierOrders, ...sub.orders]
  const inRange = (date: string, start: string) => date >= start && date < addWeeks(start, 1)
  const active = sub.status === "active"
  const thisWeekOrders = allOrders.filter((o) => inRange(o.date, thisMonday))
  // The rest of this week (e.g. a plan that starts mid-week) can still be chosen day by day, until
  // midday the day before each delivery — the same cutoff as pausing.
  const thisWeekChoosable = active ? thisWeekOrders.filter((o) => (o.status === "Scheduled" || o.status === "Paused") && canPauseDate(o.date)) : []
  // Nothing to choose once the plan is cancelled or has ended.
  const nextWeekOrders = active ? allOrders.filter((o) => inRange(o.date, nextMonday)) : []
  const needsChoice = nextWeekOrders.some((o) => !o.menuChosenAt)
  const cutoffPassed = today >= cutoff
  const showBanner = today >= wednesdayThisWeek && needsChoice && !cutoffPassed && nextWeekOrders.length > 0
  const thisWeekNeedsChoice = thisWeekChoosable.some((o) => !o.menuChosenAt)

  const thisWeekItems = useWeekMenu(thisMonday, thisWeekChoosable.length > 0)
  const nextWeekItems = useWeekMenu(nextMonday, nextWeekOrders.length > 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl text-ink mb-1">Weekly Menu</h1>
        <p className="text-ink-muted">See what's coming this week, and pick what you'd like next week.</p>
      </div>

      {thisWeekNeedsChoice && Array.isArray(thisWeekItems) && (
        <div role="alert" className="rounded-lg bg-coral-50 p-4 flex items-start gap-3">
          <CalendarRange className="h-5 w-5 text-coral-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-coral-600">Choose your meals for the rest of this week</p>
            <p className="text-sm text-ink-muted mt-0.5">Pick them below by midday the day before each delivery.</p>
          </div>
        </div>
      )}

      {showBanner && (
        <div role="alert" className="rounded-lg bg-coral-50 p-4 flex items-start gap-3">
          <CalendarRange className="h-5 w-5 text-coral-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-coral-600">Next week's menu is ready for you to choose</p>
            <p className="text-sm text-ink-muted mt-0.5">
              Pick your meals below before Friday — after that we'll go with what's already set.
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
                <span className="text-sm font-medium text-ink">{dayLabel(day.date)}</span>
                <span className="text-xs text-ink-muted text-right">{day.items.length ? day.items.map((i) => `${i.slot}: ${i.name}`).join(" · ") : "Not chosen yet"}</span>
              </div>
            ))}
          </div>
        )}

        {thisWeekChoosable.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-base text-ink mb-1">Choose or change the rest of this week</h3>
            {thisWeekItems === "loading" && <p className="text-sm text-ink-muted mt-2">Loading…</p>}
            {thisWeekItems === "unpublished" && <p className="text-sm text-ink-muted mt-2">This week's menu hasn't been published yet — check back soon.</p>}
            {thisWeekItems === null && <p className="text-sm text-coral-600 mt-2">Couldn't load this week's menu — try refreshing.</p>}
            {Array.isArray(thisWeekItems) && (
              <>
                <p className="text-sm text-ink-muted mb-4">Each day can be changed until midday the day before it's delivered.</p>
                <DayPickers key={thisWeekChoosable.map((d) => d.date).join(",")} weekStart={thisMonday} days={thisWeekChoosable} items={thisWeekItems} savedText="Saved — your meals for this week are set." />
              </>
            )}
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
            <p className="text-sm text-ink-muted mb-4 mt-1">Choose by Friday — otherwise we'll keep what's already set below.</p>
            <DayPickers key={nextWeekOrders.map((d) => d.date).join(",")} weekStart={nextMonday} days={nextWeekOrders} items={nextWeekItems} savedText="Saved — next week's menu is set." />
          </>
        )}
      </Card>
    </div>
  )
}

export default WeeklyMenu
