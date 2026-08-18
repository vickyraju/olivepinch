// toISOString() converts to UTC before formatting, which silently shifts the date for any
// timezone where local time is late enough to cross into the next UTC day — the same bug
// class the customer app's subscription.ts explicitly avoids. Build the string from local
// calendar components instead.
export function nextMondayIso(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + diff)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dd}`
}
