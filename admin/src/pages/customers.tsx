import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Header } from "@/components/header"
import { TableSkeleton } from "@/components/skeletons/table-skeleton"
import { api } from "@/lib/api"
import { getInitials } from "@/lib/status-styles"

interface CustomerRow {
  id: string
  fullName: string
  email: string
  phone: string | null
  address: string | null
  postcode: string | null
  subscribed: boolean
  createdAt: string
}

interface CustomersResponse {
  customers: CustomerRow[]
  page: number
  totalPages: number
  total: number
}

function Customers() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => setPage(1), [search])

  const customersQuery = useQuery({
    queryKey: ["customers", search, page],
    queryFn: () =>
      api.get<CustomersResponse>(`/customers?page=${page}${search ? `&search=${encodeURIComponent(search)}` : ""}`),
  })
  const data = customersQuery.data

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden ml-[260px]">
      <Header title="Customers" />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="bg-white rounded-[12px] border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-200 bg-gray-50/50">
            <div className="relative w-full max-w-[320px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {customersQuery.isLoading ? <TableSkeleton columns={6} /> : null}
                {!customersQuery.isLoading &&
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
                        <td className="py-4 px-6 text-gray-600">{c.phone ?? "—"}</td>
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
                        <td className="py-4 px-6 text-gray-600">{new Date(c.createdAt).toLocaleDateString("en-GB")}</td>
                        <td className="py-4 px-6">
                          <Link to={`/customers/${c.id}`} className="text-sm font-semibold text-primary hover:underline">
                            Details
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                {!customersQuery.isLoading && (data?.customers ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
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
