import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Sparkles } from "lucide-react"
import { useSubscribe } from "@/lib/subscribe-context"
import { MENU_ITEMS, MENU_ITEM_PHOTOS, SLOTS_BY_MEALS_PER_DAY, menuOptionsFor } from "@/data/menu"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FoodPhoto } from "@/components/ui/food-photo"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { StepNav } from "./step-nav"

const itemById = new Map(MENU_ITEMS.map((item) => [item.id, item]))

function Menu() {
  const { state, update, buildDayMenus, resetMenuToDefaults } = useSubscribe()
  const navigate = useNavigate()

  useEffect(() => {
    if (state.dayMenus.length === 0) buildDayMenus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!state.dietType || !state.goal || state.dayMenus.length === 0) {
    return <p className="text-ink-muted">Loading your menu…</p>
  }

  const slots = SLOTS_BY_MEALS_PER_DAY[state.mealsPerDay]
  const previewDay = state.dayMenus[0]

  function setItem(dayIndex: number, slotIndex: number, itemId: string) {
    const nextDayMenus = state.dayMenus.map((day, i) =>
      i === dayIndex ? { ...day, items: day.items.map((it, s) => (s === slotIndex ? itemId : it)) } : day
    )
    update({ dayMenus: nextDayMenus })
  }

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl text-ink mb-2">Customize your menu</h1>
      <p className="text-ink-muted mb-8">
        We've pre-filled every day of your {state.planDuration}-day plan based on your goal, diet, and allergies.
      </p>

      <div className="rounded-2xl bg-olive-50 border border-olive-100 p-5 flex items-start gap-3 mb-8">
        <Sparkles className="h-5 w-5 text-olive-600 shrink-0 mt-0.5" />
        <div className="flex items-center gap-3">
          <Checkbox
            id="keep-defaults"
            checked={state.useDefaultMenu}
            onCheckedChange={(v) => {
              const useDefault = v === true
              update({ useDefaultMenu: useDefault })
              if (useDefault) resetMenuToDefaults()
            }}
          />
          <Label htmlFor="keep-defaults" className="mb-0 font-medium cursor-pointer">
            Keep the recommended menu for all {state.planDuration} days
          </Label>
        </div>
      </div>

      {state.useDefaultMenu ? (
        <div>
          <p className="text-sm text-ink-muted mb-3">Applied to every day — here's what Day 1 looks like:</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {previewDay.items.map((itemId, i) => {
              const item = itemById.get(itemId)!
              return (
                <div key={i} className="rounded-xl border border-border bg-surface overflow-hidden">
                  <FoodPhoto seed={i} src={MENU_ITEM_PHOTOS[item.id]} alt={item.name} className="aspect-[4/3] rounded-none" />
                  <div className="p-4">
                    <span className="text-xs font-semibold text-coral-600">{slots[i]}</span>
                    <h3 className="text-base text-ink mt-0.5 mb-2">{item.name}</h3>
                    <div className="flex gap-1.5 flex-wrap">
                      <Badge variant="olive">{item.kcal} kcal</Badge>
                      <Badge variant="neutral">{item.protein}g protein</Badge>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <Accordion type="single" collapsible className="rounded-2xl bg-surface border border-border px-6">
          {state.dayMenus.map((day, dayIndex) => (
            <AccordionItem key={day.date} value={day.date}>
              <AccordionTrigger>
                Day {dayIndex + 1} · {new Date(day.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {day.items.map((itemId, slotIndex) => {
                    const options = menuOptionsFor(state.dietType!, state.allergens, slots[slotIndex])
                    return (
                      <div key={slotIndex}>
                        <span className="text-xs font-semibold text-coral-600">{slots[slotIndex]}</span>
                        <Select value={itemId} onValueChange={(v) => setItem(dayIndex, slotIndex, v)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {options.map((opt) => (
                              <SelectItem key={opt.id} value={opt.id}>
                                {opt.name} {opt.premium ? "· Premium" : ""}
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
      )}

      <StepNav backTo="/subscribe/plan" onContinue={() => navigate("/subscribe/profile")} />
    </div>
  )
}

export default Menu
