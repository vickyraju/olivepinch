import { useState } from "react"
import type { FormEvent } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Header } from "@/components/header"
import { TableSkeleton } from "@/components/skeletons/table-skeleton"
import { api } from "@/lib/api"

interface DeliveryTimeSlot {
  id: string
  label: string
  sortOrder: number
  active: boolean
}

function DeliverySlots() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [label, setLabel] = useState("")
  const [sortOrder, setSortOrder] = useState("0")
  const [error, setError] = useState("")

  const slotsQuery = useQuery({ queryKey: ["delivery-time-slots"], queryFn: () => api.get<DeliveryTimeSlot[]>("/delivery-time-slots") })

  function openAddModal() {
    setEditingId(null)
    setLabel("")
    setSortOrder(String((slotsQuery.data?.length ?? 0)))
    setError("")
    setShowModal(true)
  }

  function openEditModal(slot: DeliveryTimeSlot) {
    setEditingId(slot.id)
    setLabel(slot.label)
    setSortOrder(String(slot.sortOrder))
    setError("")
    setShowModal(true)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError("")
    if (!label.trim()) {
      setError("Enter a label, e.g. 6:00 – 7:00.")
      return
    }
    try {
      const data = { label: label.trim(), sortOrder: Number(sortOrder) || 0 }
      if (editingId) {
        await api.patch(`/delivery-time-slots/${editingId}`, data)
      } else {
        await api.post("/delivery-time-slots", { ...data, active: true })
      }
      setShowModal(false)
      await queryClient.invalidateQueries({ queryKey: ["delivery-time-slots"] })
    } catch {
      setError("Could not save this delivery slot.")
    }
  }

  async function toggleActive(slot: DeliveryTimeSlot) {
    await api.patch(`/delivery-time-slots/${slot.id}`, { active: !slot.active })
    await queryClient.invalidateQueries({ queryKey: ["delivery-time-slots"] })
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden ml-[260px]">
      <Header title="Delivery Time Slots" />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-6 flex justify-between items-center">
          <p className="text-sm text-gray-500">Controls the delivery windows customers can pick at signup and renewal.</p>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-[#2E6B3E] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span> New Slot
          </button>
        </div>

        <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Delivery Window</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-6 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {slotsQuery.isLoading ? (
                <TableSkeleton columns={4} rows={3} />
              ) : (
                (slotsQuery.data ?? []).map((slot) => (
                  <tr key={slot.id} className="hover:bg-gray-50/50">
                    <td className="py-4 px-6 text-gray-500">{slot.sortOrder}</td>
                    <td className="py-4 px-6 font-semibold text-gray-900">{slot.label}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          slot.active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {slot.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(slot)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(slot)}
                          className="w-[92px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          {slot.active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {!slotsQuery.isLoading && (slotsQuery.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-gray-400">
                    No delivery slots configured yet.
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
              <h3 className="text-[18px] font-bold">{editingId ? "Edit Slot" : "New Slot"}</h3>
              <button onClick={() => setShowModal(false)} className="cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Delivery Window</label>
                <input
                  className="w-full h-10 border border-gray-200 rounded-lg px-3"
                  placeholder="6:00 – 7:00"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Sort Order</label>
                <input
                  type="number"
                  className="w-full h-10 border border-gray-200 rounded-lg px-3"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                />
                <p className="text-[11px] text-gray-400">Lower numbers appear first in the customer's picker.</p>
              </div>
              {error ? <p role="alert" className="text-sm text-status-red">{error}</p> : null}
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg font-semibold text-sm cursor-pointer">
                  {editingId ? "Save Changes" : "Save Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DeliverySlots
