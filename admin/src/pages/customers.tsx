import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Search } from "lucide-react"
import { api } from "@/lib/api"
import { ACCOUNT_STATUS_STYLES } from "@/lib/status-styles"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface CustomerRow {
  id: string
  fullName: string
  email: string
  postcode: string | null
  accountStatus: string
  createdAt: string
}

interface CustomersResponse {
  customers: CustomerRow[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

function Customers() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [sort, setSort] = useState("newest")
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<CustomersResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ page: String(page), sort })
      if (search) params.set("search", search)
      if (status) params.set("status", status)
      api
        .get<CustomersResponse>(`/customers?${params.toString()}`)
        .then(setResult)
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(handle)
  }, [search, status, sort, page])

  const customers = result?.customers ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl text-ink">Customers</h1>

      <div className="flex items-end gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <Input placeholder="Search by name or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
        </div>
        <div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
            className="flex h-10 rounded-md border border-border bg-surface px-3 text-sm text-ink cursor-pointer"
          >
            <option value="">All statuses</option>
            {Object.entries(ACCOUNT_STATUS_STYLES).map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1) }}
            className="flex h-10 rounded-md border border-border bg-surface px-3 text-sm text-ink cursor-pointer"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-5 text-sm text-ink-muted">Loading…</p>
          ) : customers.length === 0 ? (
            <p className="p-5 text-sm text-ink-muted">No customers found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-ink-muted">
                  <th className="px-5 py-2.5 font-medium">Name</th>
                  <th className="px-5 py-2.5 font-medium">Email</th>
                  <th className="px-5 py-2.5 font-medium">Postcode</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const style = ACCOUNT_STATUS_STYLES[c.accountStatus]
                  return (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-cream-100">
                      <td className="px-5 py-2.5">
                        <Link to={`/customers/${c.id}`} className="text-ink font-medium hover:text-olive-600">
                          {c.fullName}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-ink-muted">{c.email}</td>
                      <td className="px-5 py-2.5 text-ink-muted">{c.postcode ?? "—"}</td>
                      <td className="px-5 py-2.5"><Badge className={style.className}>{style.label}</Badge></td>
                      <td className="px-5 py-2.5 text-ink-muted">{new Date(c.createdAt).toLocaleDateString("en-GB")}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {result && result.total > 0 && (
        <div className="flex items-center justify-between text-sm text-ink-muted">
          <p>
            Showing {(result.page - 1) * result.pageSize + 1}–{Math.min(result.page * result.pageSize, result.total)} of {result.total}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <Button size="sm" variant="outline" disabled={page >= result.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Customers
