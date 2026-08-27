export interface PublishedMenuItem {
  id: string
  name: string
  slot: string // raw backend enum, e.g. "BREAKFAST"
  price: string // Prisma Decimal serializes as a string
  dietTags: string[]
  allergenTags: string[]
  photoUrl: string | null
  description: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}
