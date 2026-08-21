export const ORDER_STATUS_STYLES: Record<string, { label: string; className: string; dot: string }> = {
  SCHEDULED: { label: "Scheduled", className: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  DELIVERED: { label: "Delivered", className: "bg-green-50 text-green-700 border-green-200 font-bold", dot: "bg-green-500" },
  ATTEMPTED: { label: "Attempted", className: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  PAUSED: { label: "Paused", className: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" },
}

export const ACCOUNT_STATUS_STYLES: Record<string, { label: string; className: string; dot: string }> = {
  PROVISIONAL: { label: "Provisional", className: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" },
  ACTIVE: { label: "Active", className: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
  READ_ONLY: { label: "Read-only", className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  DELETED: { label: "Deleted", className: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
}

export const MEAL_SLOT_STYLES: Record<string, { label: string; className: string }> = {
  BREAKFAST: { label: "Breakfast", className: "bg-amber-50 text-amber-700 border-amber-200" },
  LUNCH: { label: "Lunch", className: "bg-blue-50 text-blue-700 border-blue-200" },
  DINNER: { label: "Dinner", className: "bg-purple-50 text-purple-700 border-purple-200" },
  SNACKS: { label: "Snacks", className: "bg-green-50 text-green-700 border-green-200" },
}

// Stored/sent as "+448888888888" (no space) — display with a space after the UK
// country code everywhere it's shown, e.g. "+44 8888888888".
export function formatPhone(phone: string): string {
  return phone.startsWith("+44") ? `+44 ${phone.slice(3)}` : phone
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (first + last).toUpperCase()
}
