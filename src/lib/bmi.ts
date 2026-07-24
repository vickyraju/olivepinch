export type BmiCategory = "Underweight" | "Normal" | "Overweight" | "Obese"

export function calculateBmi(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100
  return weightKg / (heightM * heightM)
}

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "Underweight"
  if (bmi < 25) return "Normal"
  if (bmi < 30) return "Overweight"
  return "Obese"
}

export const BMI_CATEGORY_COLOR: Record<BmiCategory, "olive" | "coral" | "neutral"> = {
  Underweight: "coral",
  Normal: "olive",
  Overweight: "coral",
  Obese: "coral",
}
