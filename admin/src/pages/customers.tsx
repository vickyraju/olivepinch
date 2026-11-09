import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Header } from "@/components/header"
import { TableSkeleton } from "@/components/skeletons/table-skeleton"
import { QueryError } from "@/components/query-error"
import { api } from "@/lib/api"
import { getInitials, formatPhone, daysAgoLabel } from "@/lib/status-styles"

interface CustomerRow {
  id: string
  fullName: string
  email: string
  phone: string | null
  address: string | null
  postcode: string | null
  subscribed: boolean
  goal: string | null
  planDuration: number | null
  planStartDate: string | null
  planEndDate: string | null
  lastRenewedAt: string | null
  createdAt: string
}

interface CustomersResponse {
  customers: CustomerRow[]
  page: number
  totalPages: number
  total: number
}

const GOAL_LABELS: Record<string, string> = {
  WEIGHT_LOSS: "Weight Loss",
  WEIGHT_GAIN: "Weight Gain",
  WEIGHT_MAINTENANCE: "Weight Maintenance",
  MUSCLE_BUILDING: "Muscle Building",
}

type SubscribedFilter = "" | "true" | "false"
type RenewedFilter = "" | "7" | "14" | "30"
type SortField = "name" | "status" | "style" | "plan" | "planStartDate" | "planEndDate" | "lastRenewed" | "joined"
type SortDir = "asc" | "desc"

// What a first click on a column does: dates newest first, names A→Z.
const FIRST_DIR: Record<SortField, SortDir> = {
  name: "asc", status: "desc", style: "asc", plan: "desc", planStartDate: "desc", planEndDate: "desc", lastRenewed: "desc", joined: "desc",
}

// Dropdown shortcuts; the column headers can sort any of these either way.
const SORT_PRESETS: { label: string; sort: SortField; dir: SortDir }[] = [
  { label: "Joined (newest)", sort: "joined", dir: "desc" },
  { label: "Joined (oldest)", sort: "joined", dir: "asc" },
  { label: "Plan starts (latest)", sort: "planStartDate", dir: "desc" },
  { label: "Plan starts (soonest)", sort: "planStartDate", dir: "asc" },
  { label: "Plan ends (latest)", sort: "planEndDate", dir: "desc" },
  { label: "Plan ends (soonest)", sort: "planEndDate", dir: "asc" },
  { label: "Recently renewed", sort: "lastRenewed", dir: "desc" },
  { label: "Name (A–Z)", sort: "name", dir: "asc" },
]

const TH = "py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider"

function SortableTh({ label, field, sort, dir, onSort }: { label: string; field: SortField; sort: SortField; dir: SortDir; onSort: (f: SortField) => void }) {
  const active = sort === field
  return (
    <th className={TH} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => onSort(field)} className={`inline-flex items-center gap-1 uppercase tracking-wider cursor-pointer hover:text-gray-800 ${active ? "text-gray-900" : ""}`}>
        {label}
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
          {active ? (dir === "asc" ? "arrow_upward" : "arrow_downward") : "unfold_more"}
        </span>
      </button>
    </th>
  )
}

function Customers() {
  const [search, setSearch] = useState("")
  const [subscribedFilter, setSubscribedFilter] = useState<SubscribedFilter>("")
  const [renewedFilter, setRenewedFilter] = useState<RenewedFilter>("")
  const [sort, setSort] = useState<SortField>("joined")
  const [dir, setDir] = useState<SortDir>("desc")
  const [page, setPage] = useState(1)

  useEffect(() => setPage(1), [search, subscribedFilter, renewedFilter, sort, dir])

  // Clicking the active column flips the direction; another column starts at its natural direction.
  function sortBy(field: SortField) {
    if (field === sort) setDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSort(field)
      setDir(FIRST_DIR[field])
    }
  }
  const presetIndex = SORT_PRESETS.findIndex((p) => p.sort === sort && p.dir === dir)

  const customersQuery = useQuery({
    queryKey: ["customers", search, subscribedFilter, renewedFilter, sort, dir, page],
    queryFn: () =>
      api.get<CustomersResponse>(
        `/customers?page=${page}&sort=${sort}&dir=${dir}${search ? `&search=${encodeURIComponent(search)}` : ""}${
          subscribedFilter ? `&subscribed=${subscribedFilter}` : ""
        }${renewedFilter ? `&renewed=${renewedFilter}` : ""}`
      ),
  })
  const data = customersQuery.data

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden ml-[260px]">
      <Header title="Customers" />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-[320px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none"
              value={subscribedFilter}
              onChange={(e) => setSubscribedFilter(e.target.value as SubscribedFilter)}
            >
              <option value="">All customers</option>
              <option value="true">Subscribed</option>
              <option value="false">Unsubscribed</option>
            </select>
            <select
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none"
              value={renewedFilter}
              onChange={(e) => setRenewedFilter(e.target.value as RenewedFilter)}
              aria-label="Filter by renewal"
            >
              <option value="">Renewed: any time</option>
              <option value="7">Renewed in last 7 days</option>
              <option value="14">Renewed in last 14 days</option>
              <option value="30">Renewed in last 30 days</option>
            </select>
            <select
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none"
              value={presetIndex}
              aria-label="Sort by"
              onChange={(e) => {
                const p = SORT_PRESETS[Number(e.target.value)]
                if (p) {
                  setSort(p.sort)
                  setDir(p.dir)
                }
              }}
            >
              {presetIndex === -1 && <option value={-1}>Sorted by column</option>}
              {SORT_PRESETS.map((p, i) => (
                <option key={p.label} value={i}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <SortableTh label="Customer" field="name" sort={sort} dir={dir} onSort={sortBy} />
                  <th className={TH}>Phone</th>
                  <th className={TH}>Address</th>
                  <SortableTh label="Status" field="status" sort={sort} dir={dir} onSort={sortBy} />
                  <SortableTh label="Style" field="style" sort={sort} dir={dir} onSort={sortBy} />
                  <SortableTh label="Plan" field="plan" sort={sort} dir={dir} onSort={sortBy} />
                  <SortableTh label="Plan Starts" field="planStartDate" sort={sort} dir={dir} onSort={sortBy} />
                  <SortableTh label="Plan Ends" field="planEndDate" sort={sort} dir={dir} onSort={sortBy} />
                  <SortableTh label="Last Renewed" field="lastRenewed" sort={sort} dir={dir} onSort={sortBy} />
                  <SortableTh label="Joined" field="joined" sort={sort} dir={dir} onSort={sortBy} />
                  <th className={TH}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {customersQuery.isError ? (
                  <tr>
                    <td colSpan={11}>
                      <QueryError onRetry={() => customersQuery.refetch()} />
                    </td>
                  </tr>
                ) : null}
                {customersQuery.isLoading ? <TableSkeleton columns={10} /> : null}
                {!customersQuery.isLoading &&
                  !customersQuery.isError &&
                  (data?.customers ?? []).map((c) => {
                    return (
                      <tr key={c.id} className="hover:bg-gray-50/50">
                        <td className="py-4 px-6">
                          <Link to={`/customers/${c.id}`} className="flex items-center gap-2.5 group">
                            <span className="w-7 h-7 rounded-full bg-green-50 text-green-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                              {getInitials(c.fullName)}
                            </span>
                            <span>
                              <span className="block font-semibold text-gray-900 group-hover:text-primary transition-colors">{c.fullName}</span>
                              <span className="block text-xs text-gray-500">{c.email}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="py-4 px-6 text-gray-600">{c.phone ? formatPhone(c.phone) : "—"}</td>
                        <td className="py-4 px-6 text-gray-600 max-w-[220px] truncate" title={c.address ?? undefined}>
                          {c.address ?? c.postcode ?? "—"}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              c.subscribed ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${c.subscribed ? "bg-green-500" : "bg-gray-400"}`} />
                            {c.subscribed ? "Subscribed" : "Unsubscribed"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-600">{c.goal ? GOAL_LABELS[c.goal] ?? c.goal : "—"}</td>
                        <td className="py-4 px-6 text-gray-600">{c.planDuration ? `${c.planDuration} days` : "—"}</td>
                        <td className="py-4 px-6 text-gray-600">
                          {c.planStartDate ? new Date(c.planStartDate).toLocaleDateString("en-GB", { timeZone: "UTC" }) : "—"}
                        </td>
                        <td className="py-4 px-6 text-gray-600">
                          {c.planEndDate ? new Date(c.planEndDate).toLocaleDateString("en-GB") : "—"}
                        </td>
                        <td className="py-4 px-6 text-gray-600">
                          {c.lastRenewedAt ? (
                            <span title={new Date(c.lastRenewedAt).toLocaleString("en-GB")}>
                              <span className="block">{new Date(c.lastRenewedAt).toLocaleDateString("en-GB")}</span>
                              <span className="block text-xs text-gray-400">{daysAgoLabel(c.lastRenewedAt)}</span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-4 px-6 text-gray-600">{new Date(c.createdAt).toLocaleDateString("en-GB")}</td>
                        <td className="py-4 px-6">
                          <Link to={`/customers/${c.id}`} className="text-sm font-semibold text-primary hover:underline">
                            Details
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                {!customersQuery.isLoading && !customersQuery.isError && (data?.customers ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-sm text-gray-400">
                      No customers found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {data && data.totalPages > 1 ? (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {data.page} of {data.totalPages} · {data.total} customers
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.page === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={data.page === data.totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default Customers
