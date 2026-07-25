import { useState } from "react"
import { Pause, Play, Truck, PackageCheck, Clock, AlertTriangle } from "lucide-react"
import { useDashboard } from "@/lib/dashboard-context"
import { MAX_PAUSES_PER_MONTH, type OrderStatus } from "@/lib/subscription"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const STATUS_STYLE: Record<OrderStatus, { variant: "olive" | "coral" | "neutral"; icon: typeof Truck }> = {
  Scheduled: { variant: "neutral", icon: Clock },
  "Out for Delivery": { variant: "coral", icon: Truck },
  Delivered: { variant: "olive", icon: PackageCheck },
  Attempted: { variant: "coral", icon: AlertTriangle },
  Paused: { variant: "neutral", icon: Pause },
}

function Delivery() {
  const { customer, togglePause, endDate, pausesUsed } = useDashboard()
  const sub = customer.subscription
  const [pauseError, setPauseError] = useState("")
  const [pausingDate, setPausingDate] = useState<string | null>(null)

  const upcoming = sub.orders.filter((o) => o.status !== "Delivered").slice(0, 8)

  async function handleToggle(date: string) {
    setPausingDate(date)
    const result = await togglePause(date)
    setPauseError(result.ok ? "" : result.reason ?? "")
    setPausingDate(null)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl text-ink mb-1">Meal Delivery</h1>
        <p className="text-ink-muted">
          {sub.status === "active"
            ? <>Plan ends <strong className="text-ink">{new Date(endDate).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</strong> · {pausesUsed}/{MAX_PAUSES_PER_MONTH} pauses used this month</>
            : "Your plan has expired — renew to resume deliveries."}
        </p>
      </div>

      {pauseError && (
        <div role="alert" className="rounded-lg bg-coral-50 p-4 text-sm text-coral-600 font-medium">
          {pauseError}
        </div>
      )}

      <div>
        <h2 className="text-lg text-ink mb-3">Upcoming deliveries</h2>
        <div className="space-y-3">
          {upcoming.map((day) => {
            const style = STATUS_STYLE[day.status]
            const isFuture = day.status === "Scheduled" || day.status === "Paused"
            return (
              <Card key={day.id} className="p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", day.status === "Paused" ? "bg-cream-100" : "bg-olive-50")}>
                      <style.icon className={cn("h-4.5 w-4.5", day.status === "Paused" ? "text-ink-muted" : "text-olive-600")} />
                    </span>
                    <div>
                      <div className="font-semibold text-ink">
                        {new Date(day.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                      </div>
                      <div className="text-xs text-ink-muted mt-0.5">
                        {day.items.map((i) => i.name).join(" · ")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={style.variant}>{day.status}</Badge>
                    {isFuture && (
                      <Button
                        type="button"
                        variant={day.status === "Paused" ? "outline" : "ghost"}
                        size="sm"
                        disabled={pausingDate === day.date}
                        onClick={() => handleToggle(day.date)}
                      >
                        {day.status === "Paused" ? <><Play className="h-3.5 w-3.5" /> Resume</> : <><Pause className="h-3.5 w-3.5" /> Pause</>}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      <Card className="p-5 bg-olive-50 border-olive-100">
        <p className="text-sm text-ink-muted">
          Pausing a day doesn't cost you a meal — your plan's end date moves back by one day for every day you pause.
        </p>
      </Card>
    </div>
  )
}

export default Delivery
