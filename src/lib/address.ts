import type { DeliveryAddress } from "@/lib/subscribe-context"

export function formatAddress(a: DeliveryAddress): string {
  return [a.doorNumber, a.buildingName, a.street, a.area, a.postcode].filter(Boolean).join(", ")
}
