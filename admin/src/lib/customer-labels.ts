export const GOAL_LABELS: Record<string, string> = {
  WEIGHT_LOSS: "Weight Loss",
  WEIGHT_GAIN: "Weight Gain",
  WEIGHT_MAINTENANCE: "Weight Maintenance",
  MUSCLE_BUILDING: "Muscle Building",
}

export const DIET_LABELS: Record<string, string> = {
  MEAT: "Meat",
  FISH: "Fish",
  VEGAN: "Vegan",
  VEGETARIAN: "Vegetarian",
  EGG: "Egg",
}

export const GENDER_OPTIONS = ["Female", "Male", "Non-binary", "Prefer not to say"]

// Whole years from a YYYY-MM-DD date of birth (the API sends the date, never an age).
export function ageFromDateOfBirth(dob: string | null | undefined): number | null {
  if (!dob) return null
  const born = new Date(dob)
  if (isNaN(born.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - born.getUTCFullYear()
  const m = now.getMonth() - born.getUTCMonth()
  if (m < 0 || (m === 0 && now.getDate() < born.getUTCDate())) age--
  return age
}
