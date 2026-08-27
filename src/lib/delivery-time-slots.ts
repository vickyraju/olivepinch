import { useEffect, useState } from "react"
import { api } from "@/lib/api"

export interface DeliveryTimeSlotOption {
  id: string
  label: string
  sortOrder: number
  active: boolean
}

// Delivery windows are admin-configurable (see admin "Delivery Time Slots" page) rather
// than a fixed set, so the picker fetches them instead of hardcoding "6:00 – 7:00" etc.
export function useDeliveryTimeSlots(): DeliveryTimeSlotOption[] {
  const [slots, setSlots] = useState<DeliveryTimeSlotOption[]>([])
  useEffect(() => {
    api.get<DeliveryTimeSlotOption[]>("/delivery-time-slots").then(setSlots).catch(() => {})
  }, [])
  return slots
}
