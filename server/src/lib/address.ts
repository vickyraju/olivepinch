export interface StructuredAddress {
  addressDoorNumber: string | null
  addressBuildingName: string | null
  addressStreet: string | null
  addressArea: string | null
  addressPostcode: string | null
}

export function formatAddress(a: StructuredAddress): string | null {
  const parts = [a.addressDoorNumber, a.addressBuildingName, a.addressStreet, a.addressArea, a.addressPostcode].filter(Boolean)
  return parts.length ? parts.join(", ") : null
}
