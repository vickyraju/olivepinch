import { useRef, useState } from "react"
import { Pause, Play, Truck, PackageCheck, Clock, AlertTriangle, CalendarRange, Package } from "lucide-react"
import { useDashboard, type OrderDay } from "@/lib/dashboard-context"
import { PAUSE_LIMITS_BY_DURATION, canPauseDate, type OrderStatus } from "@/lib/subscription"
import { groupIntoBatches } from "@/lib/delivery-batches"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

const STATUS_STYLE: Record<OrderStatus, { variant: "olive" | "coral" | "neutral" | "destructive"; icon: typeof Truck }> = {
  Scheduled: { variant: "neutral", icon: Clock },
  "Out for Delivery": { variant: "coral", icon: Truck },
  Delivered: { variant: "olive", icon: PackageCheck },
  Attempted: { variant: "destructive", icon: AlertTriangle },
  Paused: { variant: "neutral", icon: Pause },
}

const PAGE_SIZE = 8

function Delivery() {
  const { customer, togglePause, pauseMultiple, endDate, pausesUsed } = useDashboard()
  const sub = customer.subscription
  const [pauseError, setPauseError] = useState("")
  const [pausingDate, setPausingDate] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const lastToggledButton = useRef<HTMLButtonElement | null>(null)

  const [selecting, setSelecting] = useState(false)
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [pausingMultiple, setPausingMultiple] = useState(false)

  const limit = PAUSE_LIMITS_BY_DURATION[sub.planDuration]
  const remaining = limit - pausesUsed
  const allUpcoming = sub.orders.filter((o) => o.status !== "Delivered")
  const upcoming = allUpcoming.slice(0, visibleCount)
  const batches = groupIntoBatches(upcoming, sub.deliverySlot)

  async function handleToggle(date: string, e: React.MouseEvent<HTMLButtonElement>) {
    lastToggledButton.current = e.currentTarget
    setPausingDate(date)
    const result = await togglePause(date)
    setPauseError(result.ok ? "" : result.reason ?? "")
    setPausingDate(null)
    // The button disables mid-request, which blurs it — refocus the same (now relabeled)
    // button once it resolves so a keyboard user doesn't lose their place.
    requestAnimationFrame(() => lastToggledButton.current?.focus())
  }

  function toggleSelected(date: string) {
    setSelectedDates((prev) => {
      if (prev.includes(date)) return prev.filter((d) => d !== date)
      if (prev.length >= remaining) return prev
      return [...prev, date]
    })
  }

  function cancelSelecting() {
    setSelecting(false)
    setSelectedDates([])
  }

  async function handlePauseSelected() {
    setPausingMultiple(true)
    const result = await pauseMultiple(selectedDates)
    setPauseError(result.ok ? "" : result.reason ?? "")
    setPausingMultiple(false)
    if (result.ok) cancelSelecting()
  }

  // A plain render helper (not a component) — defining this as a nested component would give
  // React a new component type every render, remounting it and breaking the focus-restoration
  // trick in handleToggle below.
  function renderDay(day: OrderDay) {
    const style = STATUS_STYLE[day.status]
    const withinCutoff = canPauseDate(day.date)
    const isFuture = (day.status === "Scheduled" || day.status === "Paused") && withinCutoff
    const isSelectable = selecting && day.status === "Scheduled" && withinCutoff
    return (
      <div key={day.id} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {isSelectable && (
            <Checkbox
              checked={selectedDates.includes(day.date)}
              onCheckedChange={() => toggleSelected(day.date)}
              aria-label={`Select ${new Date(day.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} to pause`}
            />
          )}
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", day.status === "Paused" ? "bg-cream-100" : "bg-olive-50")}>
            <style.icon className={cn("h-4.5 w-4.5", day.status === "Paused" ? "text-ink-muted" : "text-olive-600")} />
          </span>
          <div>
            <div className="font-semibold text-ink">
              {new Date(day.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              {day.items.map((i) => `${i.slot}: ${i.name}`).join(" · ")}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={style.variant}>{day.status}</Badge>
          {!selecting && isFuture && (day.status === "Paused" || remaining > 0) && (
            <Button
              type="button"
              variant={day.status === "Paused" ? "outline" : "ghost"}
              size="sm"
              disabled={pausingDate === day.date}
              onClick={(e) => handleToggle(day.date, e)}
            >
              {pausingDate === day.date
                ? (day.status === "Paused" ? "Resuming…" : "Pausing…")
                : day.status === "Paused" ? <><Play className="h-3.5 w-3.5" /> Resume</> : <><Pause className="h-3.5 w-3.5" /> Pause</>}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl text-ink mb-1">Meal Delivery</h1>
          <p className="text-ink-muted">
            {sub.status === "active"
              ? <>Plan ends <strong className="text-ink">{new Date(endDate).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</strong></>
              : "Your plan has expired — renew to resume deliveries."}
          </p>
        </div>
        <Badge variant={limit > 0 && remaining === 0 ? "coral" : "olive"} className="text-sm px-3.5 py-1.5">
          {limit > 0 ? `${pausesUsed}/${limit} pauses used` : "No pauses on this plan"}
        </Badge>
      </div>

      {pauseError && (
        <div role="alert" className="rounded-lg bg-coral-50 p-4 text-sm text-coral-600 font-medium">
          {pauseError}
        </div>
      )}

      {limit > 0 && remaining === 0 && (
        <div className="rounded-lg bg-coral-50 p-4 text-sm text-coral-600">
          You've used all {limit} pauses for this plan. Resuming an already-paused day frees up a slot.
        </div>
      )}

      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h2 className="text-lg text-ink">Upcoming deliveries</h2>
          {!selecting && remaining > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelecting(true)}>
              <CalendarRange className="h-3.5 w-3.5" /> Pause multiple days
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {batches.map((batch) => {
            if (batch.length === 1) {
              return (
                <Card key={batch[0].id} className="p-5">
                  {renderDay(batch[0])}
                </Card>
              )
            }
            const first = batch[0].date
            const last = batch[batch.length - 1].date
            const rangeLabel =
              first === last
                ? new Date(first).toLocaleDateString("en-GB", { day: "numeric", month: "long" })
                : `${new Date(first).toLocaleDateString("en-GB", { day: "numeric", month: "long" })} – ${new Date(last).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`
            return (
              <Card key={batch[0].id} className="p-5">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border text-sm font-medium text-ink-muted">
                  <Package className="h-4 w-4 text-olive-600" />
                  One delivery · {rangeLabel}
                </div>
                <div className="space-y-4 divide-y divide-border [&>*:not(:first-child)]:pt-4">
                  {batch.map((day) => renderDay(day))}
                </div>
              </Card>
            )
          })}
        </div>
        {visibleCount < allUpcoming.length && (
          <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
            Show {Math.min(PAGE_SIZE, allUpcoming.length - visibleCount)} more day{allUpcoming.length - visibleCount > 1 ? "s" : ""}
          </Button>
        )}
      </div>

      {selecting && (
        <div className="sticky bottom-4 rounded-xl border border-olive-200 bg-surface shadow-lifted p-4 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-ink">
            {selectedDates.length} of {remaining} available day{remaining === 1 ? "" : "s"} selected
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={cancelSelecting} disabled={pausingMultiple}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="accent"
              size="sm"
              disabled={selectedDates.length === 0 || pausingMultiple}
              onClick={handlePauseSelected}
            >
              {pausingMultiple ? "Pausing…" : `Pause ${selectedDates.length} day${selectedDates.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      )}

      <Card className="p-5 bg-olive-50 border-olive-100">
        <p className="text-sm text-ink-muted">
          Pausing a day doesn't cost you a meal — your plan's end date moves back by one day for every day you pause.
        </p>
      </Card>
    </div>
  )
}

export default Delivery
