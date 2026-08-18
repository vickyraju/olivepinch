import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Search } from "lucide-react"
import { api } from "@/lib/api"
import { ACCOUNT_STATUS_STYLES } from "@/lib/status-styles"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface CustomerRow {
  id: string
  fullName: string
  email: string
  postcode: string | null
  accountStatus: string
  createdAt: string
}

function Customers() {
  const [search, setSearch] = useState("")
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const handle = setTimeout(() => {
      api
        .get<{ customers: CustomerRow[] }>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`)
        .then((res) => setCustomers(res.customers))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(handle)
  }, [search])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl text-ink">Customers</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
        <Input placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
    </div>
  )
}

export default Customers
