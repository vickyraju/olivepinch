import { useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AdminRow {
  id: string
  name: string
  email: string
  createdAt: string
}

function Admins() {
  const { admin } = useAuth()
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  function load() {
    setLoading(true)
    api.get<AdminRow[]>("/admins").then(setAdmins).finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!name || !email || password.length < 8) {
      setError("Enter a name, email, and a password of at least 8 characters.")
      return
    }
    try {
      await api.post("/admins", { name, email, password })
      setName("")
      setEmail("")
      setPassword("")
      setShowForm(false)
      load()
    } catch {
      setError("Could not create that admin — the email may already be in use.")
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this admin's access?")) return
    try {
      await api.del(`/admins/${id}`)
      load()
    } catch {
      alert("Could not remove this admin.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl text-ink">Admin Users</h1>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Invite admin
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent>
            <form onSubmit={submit} className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="admin-name">Name</Label>
                <Input id="admin-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="admin-email">Email</Label>
                <Input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
              </div>
              {error && <p role="alert" className="col-span-2 text-sm text-destructive">{error}</p>}
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit">Create admin</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-5 text-sm text-ink-muted">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-ink-muted">
                  <th className="px-5 py-2.5 font-medium">Name</th>
                  <th className="px-5 py-2.5 font-medium">Email</th>
                  <th className="px-5 py-2.5 font-medium">Joined</th>
                  <th className="px-5 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-2.5 text-ink font-medium">{a.name}</td>
                    <td className="px-5 py-2.5 text-ink-muted">{a.email}</td>
                    <td className="px-5 py-2.5 text-ink-muted">{new Date(a.createdAt).toLocaleDateString("en-GB")}</td>
                    <td className="px-5 py-2.5 text-right">
                      {a.id !== admin?.id && (
                        <button onClick={() => remove(a.id)} className="text-destructive hover:text-destructive/80 cursor-pointer" aria-label={`Remove ${a.name}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
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

export default Admins
