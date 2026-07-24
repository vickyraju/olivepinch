export function formatPostcode(raw: string): string {
  const compact = raw.trim().toUpperCase().replace(/\s+/g, "")
  if (compact.length < 5) return compact
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`
}
