import { useQuery } from "@tanstack/react-query"
import { Header } from "@/components/header"
import { Skeleton } from "@/components/skeleton"
import { TrendBarChart } from "@/components/trend-bar-chart"
import { api } from "@/lib/api"
import { formatGBP } from "@/lib/currency"

interface RateBucket {
  renewed?: number
  chosen?: number
  total: number
  rate: number
}

interface RevenueRow {
  label: string
  total: number
}

interface ReportsSummary {
  renewalTrend: (RateBucket & { month: string })[]
  engagementTrend: (RateBucket & { week: string })[]
  revenueByGoal: RevenueRow[]
  revenueByTier: RevenueRow[]
  revenueByDuration: RevenueRow[]
  revenueByMealsPerDay: RevenueRow[]
  menuItemPopularity: { name: string; count: number }[]
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number)
  return `${MONTH_LABELS[month! - 1]} ${year}`
}

function formatWeekLabel(isoDate: string): string {
  const [, month, day] = isoDate.split("-").map(Number)
  return `${MONTH_LABELS[month! - 1]} ${day}`
}

function formatPercent(v: number): string {
  return `${Math.round(v)}%`
}

function overallRate(rows: RateBucket[], numeratorKey: "renewed" | "chosen"): number {
  const total = rows.reduce((sum, r) => sum + r.total, 0)
  const numerator = rows.reduce((sum, r) => sum + (r[numeratorKey] ?? 0), 0)
  return total ? (numerator / total) * 100 : 0
}

function KpiCard({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="bg-white p-[20px] border border-gray-200 rounded-[12px]">
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      {loading ? (
        <Skeleton className="h-7 w-24 mt-2" />
      ) : (
        <p className="text-[24px] font-bold text-gray-900 tracking-tight mt-1">{value}</p>
      )}
    </div>
  )
}

function ChartPanel({
  title,
  subtitle,
  loading,
  data,
  formatValue,
  emptyText,
  height,
}: {
  title: string
  subtitle?: string
  loading: boolean
  data: { label: string; value: number }[]
  formatValue: (v: number) => string
  emptyText: string
  height?: number
}) {
  return (
    <div className="bg-white p-[24px] border border-gray-200 rounded-[12px] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-[16px] font-bold text-gray-900">{title}</h2>
        {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
      </div>
      {loading ? (
        <Skeleton className="h-[220px] w-full" />
      ) : data.length > 0 ? (
        <TrendBarChart data={data} formatValue={formatValue} height={height ?? 220} />
      ) : (
        <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">{emptyText}</div>
      )}
    </div>
  )
}

function Reports() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports-summary"],
    queryFn: () => api.get<ReportsSummary>("/reports/summary"),
  })

  const renewalRate = overallRate(data?.renewalTrend ?? [], "renewed")
  const engagementRate = overallRate(data?.engagementTrend ?? [], "chosen")
  const revenueWindow = (data?.revenueByGoal ?? []).reduce((sum, r) => sum + r.total, 0)
  const topItem = data?.menuItemPopularity[0]?.name ?? "—"

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden ml-[260px]">
      <Header title="Reports" />
      <div className="flex-1 overflow-y-auto p-[32px] space-y-[24px]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[16px]">
          <KpiCard label="Renewal Rate" value={formatPercent(renewalRate)} loading={isLoading} />
          <KpiCard label="Menu Selection Engagement" value={formatPercent(engagementRate)} loading={isLoading} />
          <KpiCard label="Revenue (90d)" value={formatGBP(revenueWindow)} loading={isLoading} />
          <KpiCard label="Most Served Meal" value={topItem} loading={isLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[24px]">
          <ChartPanel
            title="Renewal Rate"
            subtitle="By month plan ended"
            loading={isLoading}
            data={(data?.renewalTrend ?? []).map((r) => ({ label: formatMonthLabel(r.month), value: r.rate * 100 }))}
            formatValue={formatPercent}
            emptyText="No plans have ended yet"
          />
          <ChartPanel
            title="Menu Selection Engagement"
            subtitle={`Last ${data?.engagementTrend.length ?? 12} weeks`}
            loading={isLoading}
            data={(data?.engagementTrend ?? []).map((r) => ({ label: formatWeekLabel(r.week), value: r.rate * 100 }))}
            formatValue={formatPercent}
            emptyText="No orders in this range yet"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[24px]">
          <ChartPanel
            title="Revenue by Goal"
            subtitle="Last 90 days"
            loading={isLoading}
            data={(data?.revenueByGoal ?? []).map((r) => ({ label: r.label, value: r.total }))}
            formatValue={formatGBP}
            emptyText="No revenue in this range yet"
          />
          <ChartPanel
            title="Revenue by Tier"
            subtitle="Last 90 days"
            loading={isLoading}
            data={(data?.revenueByTier ?? []).map((r) => ({ label: r.label, value: r.total }))}
            formatValue={formatGBP}
            emptyText="No revenue in this range yet"
          />
          <ChartPanel
            title="Revenue by Plan Duration"
            subtitle="Last 90 days"
            loading={isLoading}
            data={(data?.revenueByDuration ?? []).map((r) => ({ label: r.label, value: r.total }))}
            formatValue={formatGBP}
            emptyText="No revenue in this range yet"
          />
          <ChartPanel
            title="Revenue by Meals Per Day"
            subtitle="Last 90 days"
            loading={isLoading}
            data={(data?.revenueByMealsPerDay ?? []).map((r) => ({ label: r.label, value: r.total }))}
            formatValue={formatGBP}
            emptyText="No revenue in this range yet"
          />
        </div>

        <ChartPanel
          title="Most Popular Meals"
          subtitle="Times served, last 90 days"
          loading={isLoading}
          data={(data?.menuItemPopularity ?? []).map((r) => ({ label: r.name, value: r.count }))}
          formatValue={(v) => `${v} served`}
          emptyText="No orders in this range yet"
          height={280}
        />
      </div>
    </div>
  )
}

export default Reports
