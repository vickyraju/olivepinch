import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  Download, TrendingUp, CreditCard, CalendarClock, ArrowRight, UserPlus, History,
  Truck, CalendarRange, Users, MapPin, AlertTriangle,
} from "lucide-react"
import { api } from "@/lib/api"
import { formatGBP } from "@/lib/currency"
import { downloadCsv } from "@/lib/csv"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBreakdown } from "@/components/ui/status-breakdown"
import { ACCOUNT_STATUS_STYLES, ORDER_STATUS_STYLES, SUBSCRIPTION_STATUS_LABELS } from "@/lib/status-styles"
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

interface WeekSummary {
  weekStart: string
  published: boolean
}

interface DashboardSummary {
  newCustomersThisWeek: number
  accountStatusBreakdown: { status: string; count: number }[]
  subscriptionStatusBreakdown: { status: string; count: number }[]
  ordersTodayByStatus: { status: string; count: number }[]
  zoneDistribution: { zone: string; count: number }[]
  refunds: { succeeded: number; refunded: number; refundRate: number }
  recentActivity: {
    id: string
    action: string
    detail: string | null
    createdAt: string
    adminName: string
    customerId: string | null
    customerName: string | null
  }[]
}

const QUICK_ACTIONS = [
  { to: "/orders", label: "Order Board", icon: Truck },
  { to: "/menu-weeks", label: "Weekly Menu", icon: CalendarRange },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/zones", label: "Zones", icon: MapPin },
]

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

function AlertRow({ icon: Icon, title, subtitle, to, cta }: { icon: typeof CalendarClock; title: string; subtitle?: string; to: string; cta: string }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-3.5 first:pt-4 last:pb-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-coral-50 shrink-0">
          <Icon className="h-4.5 w-4.5 text-coral-600" />
        </span>
        <div>
          <p className="text-sm font-medium text-ink">{title}</p>
          {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
        </div>
      </div>
      <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-coral-600 hover:text-coral-500 shrink-0">
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

function Dashboard() {
  const [range, setRange] = useState<"daily" | "weekly">("daily")
  const [data, setData] = useState<RevenueResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<PendingEntry[] | null>(null)
  const [nextWeek, setNextWeek] = useState<WeekSummary | null>(null)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)

  useEffect(() => {
    setLoading(true)
    api
      .get<RevenueResponse>(`/revenue?range=${range}`)
      .then(setData)
      .finally(() => setLoading(false))
  }, [range])

  useEffect(() => {
    const weekStart = nextMondayIso()
    api.get<PendingEntry[]>(`/menu-weeks/${weekStart}/pending`).then(setPending).catch(() => setPending([]))
    api
      .get<WeekSummary[]>("/menu-weeks")
      .then((weeks) => setNextWeek(weeks.find((w) => w.weekStart === weekStart) ?? { weekStart, published: false }))
      .catch(() => setNextWeek(null))
    api.get<DashboardSummary>("/dashboard/summary").then(setSummary).catch(() => setSummary(null))
  }, [])

  const attemptedToday = summary?.ordersTodayByStatus.find((o) => o.status === "ATTEMPTED")?.count ?? 0
  const hasAlerts = (pending && pending.length > 0) || attemptedToday > 0

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="How the pilot is running today." />

      <div className="flex items-center gap-2 flex-wrap">
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.to} to={action.to} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <action.icon className="h-3.5 w-3.5" /> {action.label}
          </Link>
        ))}
      </div>

      {hasAlerts && (
        <Card>
          <CardHeader><CardTitle>Needs attention</CardTitle></CardHeader>
          <CardContent className="p-0 divide-y divide-border">
            {pending && pending.length > 0 && (
              <AlertRow
                icon={CalendarClock}
                title={`${pending.length} customer${pending.length === 1 ? "" : "s"} haven't chosen next week's menu`}
                subtitle={`${pending.slice(0, 3).map((p) => p.customer.fullName).join(", ")}${pending.length > 3 ? `, +${pending.length - 3} more` : ""}`}
                to="/menu-weeks"
                cta="Set it for them"
              />
            )}
            {attemptedToday > 0 && (
              <AlertRow
                icon={AlertTriangle}
                title={`${attemptedToday} ${attemptedToday === 1 ? "delivery" : "deliveries"} attempted but not completed today`}
                to="/orders"
                cta="View orders"
              />
            )}
          </CardContent>
        </Card>
      )}

      {nextWeek && (
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          Next week's menu ({nextWeek.weekStart}):
          <Badge className={nextWeek.published ? "bg-olive-50 text-olive-700 border-olive-100" : "bg-canvas text-ink-muted border-border"}>
            {nextWeek.published ? "Published" : "Draft"}
          </Badge>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-olive-50 shrink-0">
                  <TrendingUp className="h-4.5 w-4.5 text-olive-600" />
                </span>
                <div>
                  <p className="text-xs text-ink-muted">Total revenue ({range === "daily" ? "30d" : "90d"})</p>
                  <p className="font-display text-2xl font-bold text-ink tabular-nums">{data ? formatGBP(data.grandTotal) : "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex rounded-sm border border-border overflow-hidden">
                  {(["daily", "weekly"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={cn(
                        "px-2 py-1 text-[11px] font-medium cursor-pointer",
                        range === r ? "bg-olive-600 text-white" : "bg-surface text-ink-muted hover:bg-canvas"
                      )}
                    >
                      {r === "daily" ? "30d" : "90d"}
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={!data?.series.length}
                  onClick={() => data && downloadCsv(`olivepinch-revenue-${range}.csv`, data.series.map((s) => ({ date: s.date, total: s.total })))}
                  aria-label="Export CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
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
                {summary && summary.refunds.refunded > 0 && (
                  <p className="text-xs text-ink-muted mt-0.5">
                    +{summary.refunds.refunded} refunded ({Math.round(summary.refunds.refundRate * 100)}%)
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-olive-50 shrink-0">
                <UserPlus className="h-4.5 w-4.5 text-olive-600" />
              </span>
              <div>
                <p className="text-xs text-ink-muted">New customers (7d)</p>
                <p className="font-display text-2xl font-bold text-ink tabular-nums">{summary?.newCustomersThisWeek ?? "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Today's orders</CardTitle></CardHeader>
          <CardContent>
            {summary ? (
              <StatusBreakdown
                rows={summary.ordersTodayByStatus.map((r) => ({ label: ORDER_STATUS_STYLES[r.status]?.label ?? r.status, count: r.count }))}
                emptyLabel="No orders scheduled today."
              />
            ) : (
              <p className="text-sm text-ink-muted">Loading…</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Subscriptions</CardTitle></CardHeader>
          <CardContent>
            {summary ? (
              <StatusBreakdown
                rows={summary.subscriptionStatusBreakdown.map((r) => ({ label: SUBSCRIPTION_STATUS_LABELS[r.status] ?? r.status, count: r.count }))}
              />
            ) : (
              <p className="text-sm text-ink-muted">Loading…</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Customer accounts</CardTitle></CardHeader>
          <CardContent>
            {summary ? (
              <StatusBreakdown
                rows={summary.accountStatusBreakdown.map((r) => ({ label: ACCOUNT_STATUS_STYLES[r.status]?.label ?? r.status, count: r.count }))}
              />
            ) : (
              <p className="text-sm text-ink-muted">Loading…</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Delivery zones</CardTitle></CardHeader>
          <CardContent>
            {summary ? (
              <StatusBreakdown rows={summary.zoneDistribution.map((r) => ({ label: r.zone, count: r.count }))} />
            ) : (
              <p className="text-sm text-ink-muted">Loading…</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-4 w-4 text-olive-600" /> Recent admin activity</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!summary ? (
            <p className="p-5 text-sm text-ink-muted">Loading…</p>
          ) : summary.recentActivity.length === 0 ? (
            <p className="p-5 text-sm text-ink-muted">No support actions logged yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-ink-muted bg-canvas/60">
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Action</th>
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Admin</th>
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">Customer</th>
                  <th className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">When</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentActivity.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-canvas/60">
                    <td className="px-5 py-2.5 text-ink font-medium">
                      {entry.action}
                      {entry.detail && <span className="text-ink-muted font-normal"> — {entry.detail}</span>}
                    </td>
                    <td className="px-5 py-2.5 text-ink-muted">{entry.adminName}</td>
                    <td className="px-5 py-2.5 text-ink-muted">
                      {entry.customerId && entry.customerName ? (
                        <Link to={`/customers/${entry.customerId}`} className="hover:text-olive-600">{entry.customerName}</Link>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-ink-muted">{new Date(entry.createdAt).toLocaleString("en-GB")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

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
