import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Info } from "lucide-react"
import { useSubscribe } from "@/lib/subscribe-context"
import { SLOTS_BY_MEALS_PER_DAY, type MealSlot } from "@/data/menu"
import { mondayOf, toDateKey, fromDateKey } from "@/lib/subscription"
import { mealSlotFromEnum, DIET_TO_ENUM } from "@/lib/enum-map"
import { api, ApiError } from "@/lib/api"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StepNav } from "./step-nav"

interface PublishedMenuItem {
  id: string
  name: string
  slot: string // raw backend enum, e.g. "BREAKFAST"
  price: string // Prisma Decimal serializes as a string
  dietTags: string[]
  allergenTags: string[]
}

function buildDeliveryDates(startDate: string, planDuration: number): string[] {
  const start = fromDateKey(startDate)
  return Array.from({ length: planDuration }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return toDateKey(d)
  })
}

function Menu() {
  const { state, update } = useSubscribe()
  const navigate = useNavigate()

  const [weeks, setWeeks] = useState<Record<string, PublishedMenuItem[] | "unpublished" | "error"> | null>(null)

  const deliveryDates = state.startDate && state.planDuration ? buildDeliveryDates(state.startDate, state.planDuration) : []
  const spannedWeeks = [...new Set(deliveryDates.map(mondayOf))]

  useEffect(() => {
    if (spannedWeeks.length === 0) return
    let cancelled = false
    Promise.all(
      spannedWeeks.map((weekStart) =>
        api
          .get<{ weekStart: string; items: PublishedMenuItem[] }>(`/menu-weeks/${weekStart}`)
          .then((res) => [weekStart, res.items] as const)
          .catch((err) => [weekStart, err instanceof ApiError && err.status === 404 ? "unpublished" : "error"] as const)
      )
    ).then((results) => {
      if (cancelled) return
      setWeeks(Object.fromEntries(results))
      const priceEntries: Record<string, number> = {}
      for (const [, result] of results) {
        if (Array.isArray(result)) for (const item of result) priceEntries[item.id] = Number(item.price)
      }
      if (Object.keys(priceEntries).length > 0) update({ menuItemPrices: { ...state.menuItemPrices, ...priceEntries } })
    })
    return () => {
      cancelled = true
    }
    // Re-fetch only when the actual set of weeks needed changes, not on every keystroke elsewhere.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spannedWeeks.join(",")])

  // Choosable dates are a contiguous prefix — everything up to and including the first
  // unpublished/errored week's start halts explicit choice; the rest default server-side.
  const firstBlockedWeekIndex = weeks
    ? spannedWeeks.findIndex((w) => !Array.isArray(weeks[w]))
    : -1
  const choosableWeekSet = new Set(firstBlockedWeekIndex === -1 ? spannedWeeks : spannedWeeks.slice(0, firstBlockedWeekIndex))
  const choosableDates = weeks ? deliveryDates.filter((d) => choosableWeekSet.has(mondayOf(d))) : []
  const defaultDates = weeks ? deliveryDates.filter((d) => !choosableWeekSet.has(mondayOf(d))) : []

  // Drop any stale selections from a previous plan length/start date that no longer apply.
  useEffect(() => {
    const validDates = new Set(deliveryDates)
    if (state.dayMenus.some((d) => !validDates.has(d.date))) {
      update({ dayMenus: state.dayMenus.filter((d) => validDates.has(d.date)) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryDates.join(",")])

  if (!state.goal || state.dietTypes.length === 0 || !state.startDate || !state.mealsPerDay) {
    return <p className="text-ink-muted">Loading your menu…</p>
  }

  const slots = SLOTS_BY_MEALS_PER_DAY[state.mealsPerDay]
  const dietEnums = new Set(state.dietTypes.map((d) => DIET_TO_ENUM[d]))
  const excludedAllergens = new Set(state.allergens)

  function optionsFor(weekStart: string, slot: MealSlot): PublishedMenuItem[] {
    const items = weeks?.[weekStart]
    if (!Array.isArray(items)) return []
    return items.filter(
      (item) =>
        mealSlotFromEnum(item.slot) === slot &&
        item.dietTags.some((tag) => dietEnums.has(tag)) &&
        !item.allergenTags.some((a) => excludedAllergens.has(a))
    )
  }

  function setItem(date: string, slotIndex: number, itemId: string) {
    const existing = state.dayMenus.find((d) => d.date === date)
    const items = existing ? [...existing.items] : new Array(slots.length).fill("")
    items[slotIndex] = itemId
    const nextDay = { date, items }
    update({
      dayMenus: existing ? state.dayMenus.map((d) => (d.date === date ? nextDay : d)) : [...state.dayMenus, nextDay],
    })
  }

  const canContinue = choosableDates.every((date) => {
    const items = state.dayMenus.find((d) => d.date === date)?.items
    return items && items.length === slots.length && items.every(Boolean)
  })

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl text-ink mb-2">Choose your menu</h1>
      <p className="text-ink-muted mb-8">
        Pick your meals for each day we can already plan for. Days beyond what's published yet will start on
        recommended defaults — you'll get to choose those closer to the time from your dashboard.
      </p>

      {!weeks ? (
        <p className="text-ink-muted">Loading available menus…</p>
      ) : (
        <>
          {choosableDates.length > 0 && (
            <Accordion type="single" collapsible className="rounded-2xl bg-surface border border-border px-6">
              {choosableDates.map((date) => {
                const weekStart = mondayOf(date)
                const dayItems = state.dayMenus.find((d) => d.date === date)?.items ?? []
                const complete = dayItems.length === slots.length && dayItems.every(Boolean)
                return (
                  <AccordionItem key={date} value={date}>
                    <AccordionTrigger>
                      <span className="flex items-center gap-2">
                        {new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                        {!complete && <span className="text-xs font-normal text-coral-600">· Choose your meals</span>}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {slots.map((slot: MealSlot, slotIndex: number) => {
                          const options = optionsFor(weekStart, slot)
                          const value = dayItems[slotIndex]
                          return (
                            <div key={slot}>
                              <span className="text-xs font-semibold text-coral-600">{slot}</span>
                              <Select value={value || undefined} onValueChange={(v) => setItem(date, slotIndex, v)}>
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
                )
              })}
            </Accordion>
          )}

          {choosableDates.length === 0 && (
            <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-ink-muted">
              No menu has been published yet for the start of your plan — we'll begin you on recommended meals
              matched to your goal and diet, and you'll be able to choose exact meals from your dashboard once
              they're published.
            </div>
          )}

          {defaultDates.length > 0 && (
            <div className="mt-4 rounded-xl border border-border bg-cream-100 p-4 flex items-start gap-3">
              <Info className="h-4.5 w-4.5 text-ink-muted shrink-0 mt-0.5" />
              <p className="text-sm text-ink-muted">
                {defaultDates.length} day{defaultDates.length === 1 ? "" : "s"} from{" "}
                {new Date(defaultDates[0]).toLocaleDateString("en-GB", { day: "numeric", month: "long" })} onward
                {" "}aren't plannable yet — they'll start on recommended defaults, and you'll choose exact meals
                from your dashboard once that menu is published.
              </p>
            </div>
          )}
        </>
      )}

      <StepNav backTo="/subscribe/preferences" continueDisabled={!weeks || !canContinue} onContinue={() => navigate("/subscribe/profile")} />
    </div>
  )
}

export default Menu
