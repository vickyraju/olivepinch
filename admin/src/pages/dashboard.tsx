import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Header } from "@/components/header"
import { Skeleton } from "@/components/skeleton"
import { TrendLineChart } from "@/components/trend-line-chart"
import { api } from "@/lib/api"
import { formatGBP } from "@/lib/currency"
import { downloadCsv } from "@/lib/csv"

interface RevenueResponse {
  series: { date: string; total: number }[]
  grandTotal: number
  paymentCount: number
}

function Dashboard() {
  const [range, setRange] = useState<"daily" | "weekly">("daily")

  const revenueQuery = useQuery({
    queryKey: ["revenue", range],
    queryFn: () => api.get<RevenueResponse>(`/revenue?range=${range}`),
  })
  const data = revenueQuery.data

  const trendData = (data?.series ?? []).map((s) => ({ label: s.date.slice(5), value: s.total }))

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden ml-[260px]">
      <Header title="Dashboard Overview" />
      <div className="flex-1 overflow-y-auto p-[32px] space-y-[24px]">
        <div className="flex items-center justify-end gap-2">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {(["daily", "weekly"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-1.5 text-sm font-semibold cursor-pointer transition-colors ${
                  range === r ? "bg-[#2E6B3E] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {r === "daily" ? "Last 30 days" : "Last 90 days"}
              </button>
            ))}
          </div>
          <button
            onClick={() => data && downloadCsv(`olivepinch-revenue-${range}.csv`, data.series.map((s) => ({ date: s.date, total: s.total })))}
            disabled={!data?.series.length}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[18px]">download</span> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
          <div className="bg-white p-[24px] border border-gray-200 rounded-[12px] flex flex-col justify-between hover:border-gray-300 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Total Revenue ({range === "daily" ? "30d" : "90d"})
              </span>
              <div className="p-2 bg-green-50 rounded-lg text-primary">
                <span className="material-symbols-outlined text-sm">payments</span>
              </div>
            </div>
            {revenueQuery.isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <span className="text-[28px] font-bold text-gray-900 tracking-tight">
                {data ? formatGBP(data.grandTotal) : "—"}
              </span>
            )}
          </div>

          <div className="bg-white p-[24px] border border-gray-200 rounded-[12px] flex flex-col justify-between hover:border-gray-300 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Successful Payments
              </span>
              <div className="p-2 bg-blue-50 rounded-lg text-status-blue">
                <span className="material-symbols-outlined text-sm">receipt_long</span>
              </div>
            </div>
            {revenueQuery.isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <span className="text-[28px] font-bold text-gray-900 tracking-tight">{data?.paymentCount ?? "—"}</span>
            )}
          </div>
        </div>

        <div className="bg-white p-[24px] border border-gray-200 rounded-[12px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[16px] font-bold text-gray-900">Revenue Horizon</h2>
            <span className="text-xs text-gray-500">{range === "daily" ? "Last 30 days" : "Last 90 days"}</span>
          </div>
          {revenueQuery.isLoading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : trendData.length > 0 ? (
            <TrendLineChart data={trendData} formatValue={formatGBP} />
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">
              No payments in this range yet
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-[12px] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-[16px] font-bold text-gray-900">{range === "daily" ? "Daily" : "Weekly"} breakdown</h2>
          </div>
          {revenueQuery.isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : !data?.series.length ? (
            <p className="p-6 text-sm text-gray-400">No payments in this range yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Period starting</th>
                  <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...data.series].reverse().map((row) => (
                  <tr key={row.date}>
                    <td className="py-3 px-6 text-gray-900">{row.date}</td>
                    <td className="py-3 px-6 text-gray-900 text-right font-semibold">{formatGBP(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
