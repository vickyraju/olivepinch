import { useEffect, useState } from "react"
import { api } from "@/lib/api"

interface AllergenOption {
  id: string
  name: string
  sortOrder: number
  active: boolean
}

// Allergens are admin-configurable (see admin "Allergens" page) rather than a fixed set,
// so the picker fetches names instead of hardcoding "Gluten", "Dairy", etc.
export function useAllergens(): string[] {
  const [allergens, setAllergens] = useState<AllergenOption[]>([])
  useEffect(() => {
    api.get<AllergenOption[]>("/allergens").then(setAllergens).catch(() => {})
  }, [])
  return allergens.map((a) => a.name)
}
