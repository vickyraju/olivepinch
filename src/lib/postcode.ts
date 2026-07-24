// ponytail: regex-only Birmingham check (no real address-lookup API), swap for a postcode API if the pilot needs street-level validation
const BIRMINGHAM_POSTCODE = /^B\s?[1-9][0-9]?\s?[0-9][A-Z]{2}$/i

export function isBirminghamPostcode(raw: string): boolean {
  const normalized = raw.trim().toUpperCase()
  return BIRMINGHAM_POSTCODE.test(normalized)
}

export function formatPostcode(raw: string): string {
  const compact = raw.trim().toUpperCase().replace(/\s+/g, "")
  if (compact.length < 5) return compact
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`
}
