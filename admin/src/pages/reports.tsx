import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Header } from "@/components/header"
import { Skeleton } from "@/components/skeleton"
import { QueryError } from "@/components/query-error"
import { TrendBarChart } from "@/components/trend-bar-chart"
import { PartToWholeBar } from "@/components/part-to-whole-bar"
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
  customersByGoal: { label: string; count: number }[]
  menuItemPopularity: { name: string; count: number }[]
}

const GOAL_LABELS: Record<string, string> = {
  WEIGHT_LOSS: "Weight Loss",
  MUSCLE_BUILDING: "Muscle Gain",
  WEIGHT_MAINTENANCE: "Maintenance",
  WEIGHT_GAIN: "Weight Gain",
  Unknown: "Unknown",
}

// Fixed per-goal color (dataviz categorical palette) — a goal keeps its color even when a
// sibling goal has zero customers in the selected range and drops out of the bar entirely.
const GOAL_COLORS: Record<string, string> = {
  WEIGHT_LOSS: "#2a78d6",
  MUSCLE_BUILDING: "#eb6834",
  WEIGHT_MAINTENANCE: "#1baf7a",
  WEIGHT_GAIN: "#eda100",
  Unknown: "#898781",
}

const RANGE_OPTIONS = [
  { value: "7", label: "7 Days" },
  { value: "30", label: "30 Days" },
  { value: "90", label: "90 Days" },
  { value: "180", label: "6 Months" },
  { value: "all", label: "All Time" },
] as const

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
  const [range, setRange] = useState<string>("180")
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["reports-summary", range],
    queryFn: () => api.get<ReportsSummary>(`/reports/summary?range=${range}`),
  })

  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === range)?.label ?? ""
  const renewalRate = overallRate(data?.renewalTrend ?? [], "renewed")
  const engagementRate = overallRate(data?.engagementTrend ?? [], "chosen")
  const revenueWindow = (data?.revenueByGoal ?? []).reduce((sum, r) => sum + r.total, 0)
  const topItem = data?.menuItemPopularity[0]?.name ?? "—"

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden ml-[260px]">
      <Header
        title="Reports"
        actions={
          <div className="flex items-center rounded-lg border border-gray-200 p-1 bg-gray-50">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRange(opt.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  range === opt.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto p-[32px] space-y-[24px]">
        {isError ? <QueryError onRetry={() => refetch()} /> : null}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[16px]">
          <KpiCard label="Renewal Rate" value={formatPercent(renewalRate)} loading={isLoading} />
          <KpiCard label="Menu Selection Engagement" value={formatPercent(engagementRate)} loading={isLoading} />
          <KpiCard label={`Revenue (${rangeLabel})`} value={formatGBP(revenueWindow)} loading={isLoading} />
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
            subtitle={`By week, ${rangeLabel.toLowerCase()}`}
            loading={isLoading}
            data={(data?.engagementTrend ?? []).map((r) => ({ label: formatWeekLabel(r.week), value: r.rate * 100 }))}
            formatValue={formatPercent}
            emptyText="No orders in this range yet"
          />
        </div>

        <div className="bg-white p-[24px] border border-gray-200 rounded-[12px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[16px] font-bold text-gray-900">Customer Goal Split</h2>
            <span className="text-xs text-gray-500">{rangeLabel}</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-full" />
          ) : (data?.customersByGoal ?? []).length > 0 ? (
            <PartToWholeBar
              data={(data?.customersByGoal ?? []).map((r) => ({
                label: GOAL_LABELS[r.label] ?? r.label,
                value: r.count,
                color: GOAL_COLORS[r.label] ?? GOAL_COLORS.Unknown!,
              }))}
              formatValue={(v) => `${v} customer${v === 1 ? "" : "s"}`}
            />
          ) : (
            <p className="text-sm text-gray-400">No paying customers in this range yet</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[24px]">
          <ChartPanel
            title="Revenue by Goal"
            subtitle={rangeLabel}
            loading={isLoading}
            data={(data?.revenueByGoal ?? []).map((r) => ({ label: r.label, value: r.total }))}
            formatValue={formatGBP}
            emptyText="No revenue in this range yet"
          />
          <ChartPanel
            title="Revenue by Tier"
            subtitle={rangeLabel}
            loading={isLoading}
            data={(data?.revenueByTier ?? []).map((r) => ({ label: r.label, value: r.total }))}
            formatValue={formatGBP}
            emptyText="No revenue in this range yet"
          />
          <ChartPanel
            title="Revenue by Plan Duration"
            subtitle={rangeLabel}
            loading={isLoading}
            data={(data?.revenueByDuration ?? []).map((r) => ({ label: r.label, value: r.total }))}
            formatValue={formatGBP}
            emptyText="No revenue in this range yet"
          />
          <ChartPanel
            title="Revenue by Meals Per Day"
            subtitle={rangeLabel}
            loading={isLoading}
            data={(data?.revenueByMealsPerDay ?? []).map((r) => ({ label: r.label, value: r.total }))}
            formatValue={formatGBP}
            emptyText="No revenue in this range yet"
          />
        </div>

        <ChartPanel
          title="Most Popular Meals"
          subtitle={`Times served, ${rangeLabel.toLowerCase()}`}
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
