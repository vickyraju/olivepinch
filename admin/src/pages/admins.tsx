import { useState } from "react"
import type { FormEvent } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Header } from "@/components/header"
import { TableSkeleton } from "@/components/skeletons/table-skeleton"
import { QueryError } from "@/components/query-error"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface AdminRow {
  id: string
  name: string
  email: string
  createdAt: string
}

function Admins() {
  const queryClient = useQueryClient()
  const { admin: currentAdmin } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const adminsQuery = useQuery({ queryKey: ["admins"], queryFn: () => api.get<AdminRow[]>("/admins") })

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)
    try {
      await api.post("/admins", form)
      setForm({ name: "", email: "", password: "" })
      setShowModal(false)
      await queryClient.invalidateQueries({ queryKey: ["admins"] })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create this admin.")
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this admin's access?")) return
    try {
      await api.del(`/admins/${id}`)
      await queryClient.invalidateQueries({ queryKey: ["admins"] })
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not remove this admin.")
    }
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden ml-[260px]">
      <Header title="Admin Users" />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-6 flex justify-between items-center">
          <p className="text-sm text-gray-500">Anyone with a login here can manage menu, zones, customers, and orders.</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#2E6B3E] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span> Invite Admin
          </button>
        </div>

        <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Added</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {adminsQuery.isError ? (
                <tr>
                  <td colSpan={4}>
                    <QueryError onRetry={() => adminsQuery.refetch()} />
                  </td>
                </tr>
              ) : adminsQuery.isLoading ? (
                <TableSkeleton columns={4} rows={3} />
              ) : (
                (adminsQuery.data ?? []).map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/50">
                    <td className="py-4 px-6 font-semibold text-gray-900">
                      {a.name} {a.id === currentAdmin?.id ? <span className="text-gray-400 font-normal">(you)</span> : null}
                    </td>
                    <td className="py-4 px-6 text-gray-600">{a.email}</td>
                    <td className="py-4 px-6 text-gray-600">{new Date(a.createdAt).toLocaleDateString("en-GB")}</td>
                    <td className="py-4 px-6 text-right">
                      {a.id !== currentAdmin?.id ? (
                        <button
                          onClick={() => remove(a.id)}
                          className="text-status-red hover:text-red-700 text-sm font-semibold cursor-pointer"
                        >
                          Remove
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[16px] w-[420px] shadow-xl flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-[18px] font-bold">Invite Admin</h3>
              <button onClick={() => setShowModal(false)} className="cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</label>
                <input
                  className="w-full h-10 border border-gray-200 rounded-lg px-3"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  className="w-full h-10 border border-gray-200 rounded-lg px-3"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Temporary Password</label>
                <input
                  type="text"
                  className="w-full h-10 border border-gray-200 rounded-lg px-3"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  minLength={8}
                  required
                />
              </div>
              {error ? <p role="alert" className="text-sm text-status-red">{error}</p> : null}
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-primary text-white rounded-lg font-semibold text-sm disabled:opacity-60 cursor-pointer">
                  {saving ? "Saving..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Admins
