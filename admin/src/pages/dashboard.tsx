import { useEffect, useState } from "react"
import { Download, TrendingUp } from "lucide-react"
import { api } from "@/lib/api"
import { formatGBP } from "@/lib/currency"
import { downloadCsv } from "@/lib/csv"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RevenueResponse {
  series: { date: string; total: number }[]
  grandTotal: number
  paymentCount: number
}

function Dashboard() {
  const [range, setRange] = useState<"daily" | "weekly">("daily")
  const [data, setData] = useState<RevenueResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api
      .get<RevenueResponse>(`/revenue?range=${range}`)
      .then(setData)
      .finally(() => setLoading(false))
  }, [range])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl text-ink">Revenue</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border overflow-hidden">
            {(["daily", "weekly"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium cursor-pointer",
                  range === r ? "bg-olive-600 text-white" : "bg-surface text-ink-muted hover:bg-cream-100"
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
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-olive-50">
              <TrendingUp className="h-5 w-5 text-olive-600" />
            </span>
            <div>
              <p className="text-xs text-ink-muted">Total revenue ({range === "daily" ? "30d" : "90d"})</p>
              <p className="font-display text-2xl font-bold text-ink">{data ? formatGBP(data.grandTotal) : "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-ink-muted">Successful payments</p>
            <p className="font-display text-2xl font-bold text-ink">{data?.paymentCount ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

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
                <tr className="border-b border-border text-left text-ink-muted">
                  <th className="px-5 py-2.5 font-medium">Period starting</th>
                  <th className="px-5 py-2.5 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {[...data.series].reverse().map((row) => (
                  <tr key={row.date} className="border-b border-border last:border-0">
                    <td className="px-5 py-2.5 text-ink">{row.date}</td>
                    <td className="px-5 py-2.5 text-ink text-right font-medium">{formatGBP(row.total)}</td>
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
