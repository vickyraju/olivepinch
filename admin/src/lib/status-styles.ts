export const ORDER_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: "Scheduled", className: "bg-blue-50 text-blue-700 border-blue-200" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", className: "bg-amber-50 text-amber-700 border-amber-200" },
  DELIVERED: { label: "Delivered", className: "bg-green-50 text-green-700 border-green-200 font-bold" },
  ATTEMPTED: { label: "Attempted", className: "bg-red-50 text-red-700 border-red-200" },
  PAUSED: { label: "Paused", className: "bg-gray-100 text-gray-600 border-gray-200" },
}

export const ACCOUNT_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  PROVISIONAL: { label: "Provisional", className: "bg-gray-100 text-gray-600 border-gray-200" },
  ACTIVE: { label: "Active", className: "bg-green-50 text-green-700 border-green-200" },
  READ_ONLY: { label: "Read-only", className: "bg-amber-50 text-amber-700 border-amber-200" },
  DELETED: { label: "Deleted", className: "bg-red-50 text-red-700 border-red-200" },
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (first + last).toUpperCase()
}
