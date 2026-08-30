import { useRef, useState } from "react"
import type { FormEvent } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import * as XLSX from "xlsx"
import { Header } from "@/components/header"
import { TableSkeleton } from "@/components/skeletons/table-skeleton"
import { QueryError } from "@/components/query-error"
import { api } from "@/lib/api"

interface Zone {
  id: string
  name: string
  postcodePrefixes: string[]
  isActive: boolean
}

function parsePostcodeList(raw: string): string[] {
  return [...new Set(raw.split(/[,\n]/).map((p) => p.trim().toUpperCase()).filter(Boolean))]
}

function Zones() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [prefixes, setPrefixes] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const zonesQuery = useQuery({ queryKey: ["zones"], queryFn: () => api.get<Zone[]>("/zones") })

  function openAddModal() {
    setEditingId(null)
    setName("")
    setPrefixes("")
    setError("")
    setShowModal(true)
  }

  function openEditModal(zone: Zone) {
    setEditingId(zone.id)
    setName(zone.name)
    setPrefixes(zone.postcodePrefixes.join(", "))
    setError("")
    setShowModal(true)
  }

  async function handleExcelImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array" })
    const sheet = workbook.Sheets[workbook.SheetNames[0] as string]
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })
    const imported = rows.map((row) => String(row[0] ?? "").trim().toUpperCase()).filter(Boolean)
    setPrefixes((current) => parsePostcodeList([current, ...imported].join(",")).join(", "))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError("")
    const list = parsePostcodeList(prefixes)
    if (!name || !list.length) {
      setError("Enter a zone name and at least one postcode (e.g. B14).")
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await api.patch(`/zones/${editingId}`, { name, postcodePrefixes: list })
      } else {
        await api.post("/zones", { name, postcodePrefixes: list, isActive: true })
      }
      setShowModal(false)
      await queryClient.invalidateQueries({ queryKey: ["zones"] })
    } catch {
      setError("Could not save this zone.")
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(zone: Zone) {
    await api.patch(`/zones/${zone.id}`, { isActive: !zone.isActive })
    await queryClient.invalidateQueries({ queryKey: ["zones"] })
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden ml-[260px]">
      <Header title="Postcode Coverage" />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-6 flex justify-between items-center">
          <p className="text-sm text-gray-500">Controls which postcodes are eligible for delivery at signup.</p>
          <button
            onClick={openAddModal}
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
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Postcodes</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {zonesQuery.isError ? (
                <tr>
                  <td colSpan={4}>
                    <QueryError onRetry={() => zonesQuery.refetch()} />
                  </td>
                </tr>
              ) : zonesQuery.isLoading ? (
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
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(zone)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(zone)}
                          className="w-[92px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          {zone.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {!zonesQuery.isLoading && !zonesQuery.isError && (zonesQuery.data ?? []).length === 0 ? (
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
          <div className="bg-white rounded-[16px] w-[460px] shadow-xl flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-[18px] font-bold">{editingId ? "Edit Zone" : "New Zone"}</h3>
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
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Postcodes</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] font-semibold text-[#2E6B3E] hover:underline cursor-pointer"
                  >
                    Import from Excel
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleExcelImport}
                  />
                </div>
                <textarea
                  className="w-full h-28 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="B14, B15, B16"
                  value={prefixes}
                  onChange={(e) => setPrefixes(e.target.value)}
                />
                <p className="text-[11px] text-gray-400">Paste comma-separated or one per line, or import a spreadsheet's first column.</p>
              </div>
              {error ? <p role="alert" className="text-sm text-status-red">{error}</p> : null}
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-primary text-white rounded-lg font-semibold text-sm disabled:opacity-60 cursor-pointer">
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Save Zone"}
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
