import { useState } from "react"
import type { FormEvent } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Header } from "@/components/header"
import { TableSkeleton } from "@/components/skeletons/table-skeleton"
import { api } from "@/lib/api"

interface Zone {
  id: string
  name: string
  postcodePrefixes: string[]
  isActive: boolean
}

function Zones() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState("")
  const [prefixes, setPrefixes] = useState("")
  const [error, setError] = useState("")

  const zonesQuery = useQuery({ queryKey: ["zones"], queryFn: () => api.get<Zone[]>("/zones") })

  async function submit(e: FormEvent) {
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
      setShowModal(false)
      await queryClient.invalidateQueries({ queryKey: ["zones"] })
    } catch {
      setError("Could not save this zone.")
    }
  }

  async function toggleActive(zone: Zone) {
    await api.patch(`/zones/${zone.id}`, { isActive: !zone.isActive })
    await queryClient.invalidateQueries({ queryKey: ["zones"] })
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden ml-[260px]">
      <Header title="Delivery Zones" />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-6 flex justify-between items-center">
          <p className="text-sm text-gray-500">Controls which postcode areas are eligible for delivery at signup.</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#2E6B3E] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span> New Zone
          </button>
        </div>

        <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Zone</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Postcode Areas</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {zonesQuery.isLoading ? (
                <TableSkeleton columns={4} rows={3} />
              ) : (
                (zonesQuery.data ?? []).map((zone) => (
                  <tr key={zone.id} className="hover:bg-gray-50/50">
                    <td className="py-4 px-6 font-semibold text-gray-900">{zone.name}</td>
                    <td className="py-4 px-6">
                      <div className="flex gap-1 flex-wrap">
                        {zone.postcodePrefixes.map((p) => (
                          <span key={p} className="px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-gray-100 text-gray-600 border-gray-200">
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          zone.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {zone.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => toggleActive(zone)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        {zone.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
              {!zonesQuery.isLoading && (zonesQuery.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-gray-400">
                    No zones configured yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[16px] w-[420px] shadow-xl flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-[18px] font-bold">New Zone</h3>
              <button onClick={() => setShowModal(false)} className="cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Zone Name</label>
                <input
                  className="w-full h-10 border border-gray-200 rounded-lg px-3"
                  placeholder="Birmingham"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Postcode Areas (comma-separated)</label>
                <input
                  className="w-full h-10 border border-gray-200 rounded-lg px-3"
                  placeholder="B"
                  value={prefixes}
                  onChange={(e) => setPrefixes(e.target.value)}
                />
              </div>
              {error ? <p role="alert" className="text-sm text-status-red">{error}</p> : null}
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg font-semibold text-sm cursor-pointer">
                  Save Zone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Zones
