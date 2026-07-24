import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface Zone {
  id: string
  name: string
  postcodePrefixes: string[]
  isActive: boolean
}

function Zones() {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [prefixes, setPrefixes] = useState("")
  const [error, setError] = useState("")

  function load() {
    setLoading(true)
    api.get<Zone[]>("/zones").then(setZones).finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const list = prefixes.split(",").map((p) => p.trim().toUpperCase()).filter(Boolean)
    if (!name || !list.length) {
      setError("Enter a zone name and at least one postcode area (e.g. B).")
      return
    }
    try {
      await api.post("/zones", { name, postcodePrefixes: list, isActive: true })
      setName("")
      setPrefixes("")
      setShowForm(false)
      load()
    } catch {
      setError("Could not save this zone.")
    }
  }

  async function toggleActive(zone: Zone) {
    await api.patch(`/zones/${zone.id}`, { isActive: !zone.isActive })
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl text-ink">Delivery Zones</h1>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> New zone
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent>
            <form onSubmit={submit} className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="zone-name">Zone name</Label>
                <Input id="zone-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Birmingham" />
              </div>
              <div>
                <Label htmlFor="zone-prefixes">Postcode areas (comma-separated)</Label>
                <Input id="zone-prefixes" value={prefixes} onChange={(e) => setPrefixes(e.target.value)} placeholder="B" />
              </div>
              {error && <p role="alert" className="col-span-2 text-sm text-destructive">{error}</p>}
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit">Save zone</Button>
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
                  <th className="px-5 py-2.5 font-medium">Zone</th>
                  <th className="px-5 py-2.5 font-medium">Postcode areas</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-2.5 text-ink font-medium">{zone.name}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex gap-1 flex-wrap">
                        {zone.postcodePrefixes.map((p) => <Badge key={p} className="bg-cream-100 text-ink-muted border-border">{p}</Badge>)}
                      </div>
                    </td>
                    <td className="px-5 py-2.5">
                      <Badge className={zone.isActive ? "bg-olive-50 text-olive-700 border-olive-100" : "bg-cream-100 text-ink-muted border-border"}>
                        {zone.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <Button variant="outline" size="sm" onClick={() => toggleActive(zone)}>
                        {zone.isActive ? "Deactivate" : "Activate"}
                      </Button>
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

export default Zones
