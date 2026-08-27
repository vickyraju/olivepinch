import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { Header } from "@/components/header"
import { Skeleton } from "@/components/skeleton"
import { TrendBarChart } from "@/components/trend-bar-chart"
import { api, BASE_URL, getToken } from "@/lib/api"
import { formatGBP } from "@/lib/currency"
import { ACCOUNT_STATUS_STYLES } from "@/lib/status-styles"

interface RevenueResponse {
  series: { date: string; total: number }[]
  grandTotal: number
  paymentCount: number
}

interface StatusCount {
  status: string
  count: number
}

interface DashboardSummary {
  newCustomersThisWeek: number
  accountStatusBreakdown: StatusCount[]
  subscriptionStatusBreakdown: StatusCount[]
  subscriptionDurationBreakdown: StatusCount[]
  upcomingRenewals: { customerId: string; customerName: string; endDate: string }[]
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

interface WeekSummary {
  weekStart: string
  published: boolean
  itemCount: number
}

function nextMondayIso(): string {
  const d = new Date()
  const day = d.getUTCDay()
  const daysUntilMonday = day === 1 ? 7 : ((8 - day) % 7)
  d.setUTCDate(d.getUTCDate() + (daysUntilMonday || 7))
  return d.toISOString().slice(0, 10)
}

// Admin's soft target is to publish next week's menu by Tuesday night — don't nag about an
// unpublished week before then, since nextMondayIso() on a Monday points a week further out.
function isPastPublishSoftDeadline(): boolean {
  const day = new Date().getUTCDay()
  return day !== 1 && day !== 2
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatChartDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-").map(Number)
  return `${MONTH_LABELS[month - 1]} ${day}`
}

function formatActionLabel(action: string): string {
  const words = action.replace(/-/g, " ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function KpiCard({ icon, iconBg, iconColor, label, value, loading }: { icon: string; iconBg: string; iconColor: string; label: string; value: string; loading: boolean }) {
  return (
    <div className="bg-white p-[20px] border border-gray-200 rounded-[12px] flex flex-col justify-between hover:border-gray-300 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-lg ${iconBg} ${iconColor}`}>
          <span className="material-symbols-outlined text-sm">{icon}</span>
        </div>
      </div>
      {loading ? <Skeleton className="h-7 w-20" /> : <span className="text-[24px] font-bold text-gray-900 tracking-tight">{value}</span>}
    </div>
  )
}

function DistributionRows({ rows, styles, loading, emptyText }: { rows: StatusCount[]; styles: Record<string, { label: string; className: string }>; loading: boolean; emptyText: string }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    )
  }
  if (!rows.length) return <p className="text-sm text-gray-400">{emptyText}</p>
  const max = Math.max(...rows.map((r) => r.count), 1)
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const style = styles[row.status] ?? { label: row.status, className: "bg-gray-100 text-gray-600 border-gray-200" }
        return (
          <div key={row.status} className="flex items-center gap-3">
            <span className={`shrink-0 w-[130px] truncate text-xs font-semibold px-2 py-1 rounded-full border text-center ${style.className}`}>
              {style.label}
            </span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${(row.count / max) * 100}%` }} />
            </div>
            <span className="w-8 text-right text-sm font-bold text-gray-900">{row.count}</span>
          </div>
        )
      })}
    </div>
  )
}

function Dashboard() {
  const nextMonday = nextMondayIso()
  const [exporting, setExporting] = useState(false)

  async function exportForKitchen() {
    setExporting(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const res = await fetch(`${BASE_URL}/orders/kitchen-export?from=${today}&to=${today}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error("Couldn't export the kitchen sheet.")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `kitchen-export-${today}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't export the kitchen sheet.")
    } finally {
      setExporting(false)
    }
  }

  const revenueQuery = useQuery({
    queryKey: ["revenue", "daily"],
    queryFn: () => api.get<RevenueResponse>("/revenue?range=daily"),
  })
  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.get<DashboardSummary>("/dashboard/summary"),
  })
  const weeksQuery = useQuery({
    queryKey: ["menu-weeks"],
    queryFn: () => api.get<WeekSummary[]>("/menu-weeks"),
  })
  const pendingQuery = useQuery({
    queryKey: ["menu-weeks-pending", nextMonday],
    queryFn: () => api.get<{ subscriptionId: string }[]>(`/menu-weeks/${nextMonday}/pending`),
  })

  const data = revenueQuery.data
  const summary = summaryQuery.data
  const trendData = (data?.series ?? []).map((s) => ({ label: formatChartDate(s.date), value: s.total }))

  const activeSubscriptions = summary?.subscriptionStatusBreakdown.find((s) => s.status === "ACTIVE")?.count ?? 0

  const nextWeekEntry = weeksQuery.data?.find((w) => w.weekStart === nextMonday)
  const nextWeekPublished = nextWeekEntry?.published ?? false
  const pendingCount = pendingQuery.data?.length ?? 0
  const showPublishAlert = !nextWeekPublished && isPastPublishSoftDeadline()
  const showAlerts = !weeksQuery.isLoading && !pendingQuery.isLoading && (pendingCount > 0 || showPublishAlert)

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden ml-[260px]">
      <Header
        title="Dashboard Overview"
        actions={
          <button
            type="button"
            onClick={exportForKitchen}
            disabled={exporting}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50"
          >
            {exporting ? "Exporting…" : "Export for Kitchen"}
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-[32px] space-y-[24px]">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-[16px]">
          <KpiCard icon="payments" iconBg="bg-green-50" iconColor="text-primary" label="Revenue (30d)" value={data ? formatGBP(data.grandTotal) : "—"} loading={revenueQuery.isLoading} />
          <KpiCard icon="person_add" iconBg="bg-purple-50" iconColor="text-purple-600" label="New Customers (7d)" value={summary ? String(summary.newCustomersThisWeek) : "—"} loading={summaryQuery.isLoading} />
          <KpiCard icon="verified" iconBg="bg-green-50" iconColor="text-primary" label="Active Subscriptions" value={summary ? String(activeSubscriptions) : "—"} loading={summaryQuery.isLoading} />
        </div>

        {showAlerts && (
          <div className="space-y-2">
            {pendingCount > 0 && (
              <Link
                to={`/menu-weeks?week=${nextMonday}`}
                className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-[12px] px-5 py-3 hover:bg-amber-100 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <span className="material-symbols-outlined text-[18px]">schedule</span>
                  {pendingCount} customer{pendingCount === 1 ? "" : "s"} haven't picked next week's menu ({nextMonday})
                </span>
                <span className="text-xs font-semibold text-amber-700">Resolve →</span>
              </Link>
            )}
            {showPublishAlert && (
              <Link
                to={`/menu-weeks?week=${nextMonday}`}
                className="flex items-center justify-between bg-red-50 border border-red-200 rounded-[12px] px-5 py-3 hover:bg-red-100 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-red-800">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  Next week's menu ({nextMonday}) isn't published yet
                </span>
                <span className="text-xs font-semibold text-red-700">Publish →</span>
              </Link>
            )}
          </div>
        )}

        <div className="bg-white p-[24px] border border-gray-200 rounded-[12px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[16px] font-bold text-gray-900">Revenue Horizon</h2>
            <span className="text-xs text-gray-500">Last 30 days</span>
          </div>
          {revenueQuery.isLoading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : trendData.length > 0 ? (
            <TrendBarChart data={trendData} formatValue={formatGBP} />
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">
              No payments in this range yet
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[24px]">
          <div className="bg-white p-[24px] border border-gray-200 rounded-[12px]">
            <h2 className="text-[16px] font-bold text-gray-900 mb-5">Upcoming Renewals</h2>
            {summaryQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : !summary?.upcomingRenewals.length ? (
              <p className="text-sm text-gray-400">No renewals due in the next 14 days.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {summary.upcomingRenewals.map((r) => (
                  <li key={r.customerId}>
                    <Link
                      to={`/customers/${r.customerId}`}
                      className="flex items-center justify-between py-2.5 hover:bg-gray-50/50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <span className="text-sm font-semibold text-gray-900">{r.customerName}</span>
                      <span className="text-sm text-gray-500">{new Date(r.endDate).toLocaleDateString("en-GB")}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-white p-[24px] border border-gray-200 rounded-[12px] space-y-6">
            <div>
              <h2 className="text-[16px] font-bold text-gray-900 mb-5">Subscriptions</h2>
              <DistributionRows rows={summary?.subscriptionDurationBreakdown ?? []} styles={{}} loading={summaryQuery.isLoading} emptyText="No subscriptions yet." />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-gray-900 mb-5">Customer Accounts</h2>
              <DistributionRows rows={summary?.accountStatusBreakdown ?? []} styles={ACCOUNT_STATUS_STYLES} loading={summaryQuery.isLoading} emptyText="No customers yet." />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-[12px] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-[16px] font-bold text-gray-900">Recent Activity</h2>
          </div>
          {summaryQuery.isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : !summary?.recentActivity.length ? (
            <p className="p-6 text-sm text-gray-400">No admin activity yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {summary.recentActivity.map((entry) => (
                <li key={entry.id} className="px-6 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-semibold">{entry.adminName}</span> {formatActionLabel(entry.action).toLowerCase()}
                      {entry.customerId && entry.customerName && (
                        <>
                          {" — "}
                          <Link to={`/customers/${entry.customerId}`} className="text-primary hover:underline">{entry.customerName}</Link>
                        </>
                      )}
                    </p>
                    {entry.detail && <p className="text-xs text-gray-500 truncate">{entry.detail}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">{new Date(entry.createdAt).toLocaleString("en-GB")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
