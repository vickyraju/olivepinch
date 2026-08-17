import { prisma } from "./prisma.js"

export function formatPostcode(raw: string): string {
  const compact = raw.trim().toUpperCase().replace(/\s+/g, "")
  if (compact.length < 5) return compact
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`
}

const UK_POSTCODE = /^([A-Z]{1,2})[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i

// Shared by /postcode/check (pre-signup eligibility) and the post-login address-edit
// endpoint — both need to confirm a postcode falls in one of the currently active
// delivery zones (Birmingham only, for now, but zones are admin-configurable).
export async function isPostcodeInActiveZone(rawPostcode: string): Promise<boolean> {
  const normalized = rawPostcode.trim().toUpperCase()
  if (!UK_POSTCODE.test(normalized)) return false

  try {
    const pcResponse = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(normalized)}`)
    if (!pcResponse.ok) return false

    const { result } = (await pcResponse.json()) as { result: { outcode: string } }
    const areaMatch = result.outcode.match(/^[A-Z]+/)
    const area = areaMatch ? areaMatch[0] : ""

    const activeZones = await prisma.zone.findMany({ where: { isActive: true } })
    return activeZones.some((zone) => zone.postcodePrefixes.includes(area))
  } catch {
    return false
  }
}
