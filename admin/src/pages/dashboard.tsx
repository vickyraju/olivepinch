import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Download, TrendingUp, CreditCard, CalendarClock, ArrowRight } from "lucide-react"
import { api } from "@/lib/api"
import { formatGBP } from "@/lib/currency"
import { downloadCsv } from "@/lib/csv"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { cn } from "@/lib/utils"
import { nextMondayIso } from "@/lib/dates"

interface RevenueResponse {
  series: { date: string; total: number }[]
  grandTotal: number
  paymentCount: number
}

interface PendingEntry {
  subscriptionId: string
  customer: { id: string; fullName: string; email: string }
  missingDates: string[]
}

// Small real-data trend, not decoration — the last dozen points of the actual series
// driving the card above it, so a glance shows direction without opening the table.
function MiniTrend({ series }: { series: { date: string; total: number }[] }) {
  const points = series.slice(-14)
  const max = Math.max(...points.map((p) => p.total), 1)
  return (
    <div className="flex items-end gap-1 h-8">
      {points.map((p) => (
        <div
          key={p.date}
          className="w-3 shrink-0 rounded-[1px] bg-olive-300"
          style={{ height: `${Math.max(10, (p.total / max) * 100)}%` }}
          title={`${p.date}: ${formatGBP(p.total)}`}
        />
      ))}
    </div>
  )
}

function Dashboard() {
  const [range, setRange] = useState<"daily" | "weekly">("daily")
  const [data, setData] = useState<RevenueResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<PendingEntry[] | null>(null)

  useEffect(() => {
    setLoading(true)
    api
      .get<RevenueResponse>(`/revenue?range=${range}`)
      .then(setData)
      .finally(() => setLoading(false))
  }, [range])

  useEffect(() => {
    api.get<PendingEntry[]>(`/menu-weeks/${nextMondayIso()}/pending`).then(setPending).catch(() => setPending([]))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue"
        description="Payment activity across the pilot."
        actions={
          <>
            <div className="flex rounded-sm border border-border overflow-hidden">
              {(["daily", "weekly"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium cursor-pointer",
                    range === r ? "bg-olive-600 text-white" : "bg-surface text-ink-muted hover:bg-canvas"
                  )}
                >
                  {r === "daily" ? "Last 30 days" : "Last 90 days"}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!data?.series.length}
              onClick={() => data && downloadCsv(`olivepinch-revenue-${range}.csv`, data.series.map((s) => ({ date: s.date, total: s.total })))}
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-olive-50 shrink-0">
                  <TrendingUp className="h-4.5 w-4.5 text-olive-600" />
                </span>
                <div>
                  <p className="text-xs text-ink-muted">Total revenue ({range === "daily" ? "30d" : "90d"})</p>
                  <p className="font-display text-2xl font-bold text-ink tabular-nums">{data ? formatGBP(data.grandTotal) : "—"}</p>
                </div>
              </div>
            </div>
            {data && data.series.length > 1 && <MiniTrend series={data.series} />}
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-olive-50 shrink-0">
                <CreditCard className="h-4.5 w-4.5 text-olive-600" />
              </span>
              <div>
                <p className="text-xs text-ink-muted">Successful payments</p>
                <p className="font-display text-2xl font-bold text-ink tabular-nums">{data?.paymentCount ?? "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {pending && pending.length > 0 && (
        <Card>
          <CardContent>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-coral-50 shrink-0">
                  <CalendarClock className="h-4.5 w-4.5 text-coral-600" />
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">
                    {pending.length} customer{pending.length === 1 ? "" : "s"} haven't chosen next week's menu
                  </p>
                  <p className="text-xs text-ink-muted">
                    {pending.slice(0, 3).map((p) => p.customer.fullName).join(", ")}
                    {pending.length > 3 ? `, +${pending.length - 3} more` : ""}
                  </p>
                </div>
              </div>
              <Link to="/menu-weeks" className="inline-flex items-center gap-1 text-sm font-medium text-coral-600 hover:text-coral-500 shrink-0">
                Set it for them <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{range === "daily" ? "Daily" : "Weekly"} breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-5 text-sm text-ink-muted">Loading…</p>
          ) : !data?.series.length ? (
            <p className="p-5 text-sm text-ink-muted">No payments in this range yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-ink-muted bg-canvas/60">
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Period starting</th>
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {[...data.series].reverse().map((row) => (
                  <tr key={row.date} className="border-b border-border last:border-0 hover:bg-canvas/60">
                    <td className="px-5 py-2.5 text-ink">{row.date}</td>
                    <td className="px-5 py-2.5 text-ink text-right font-medium tabular-nums">{formatGBP(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard
