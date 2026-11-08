export interface PublishedMenuItem {
  id: string
  name: string
  slot: string // raw backend enum, e.g. "BREAKFAST"
  price: string // Prisma Decimal serializes as a string
  dietTags: string[]
  tier: string // "BASIC" | "ADVANCED": a Basic plan is only offered Basic dishes, Advanced only Advanced
  allergenTags: string[]
  photoUrl: string | null
  description: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  date: string // YYYY-MM-DD this item is served on within the published week
}
