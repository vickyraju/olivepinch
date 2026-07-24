export type Goal = "Weight Loss" | "Weight Gain" | "Weight Maintenance" | "Muscle Building"
export type DietType = "Meat" | "Fish" | "Vegan" | "Vegetarian" | "Egg"
export type MealSlot = "Breakfast" | "Lunch" | "Dinner"

export const GOALS: { id: Goal; description: string }[] = [
  { id: "Weight Loss", description: "Calorie-controlled meals that keep you full and on track." },
  { id: "Weight Gain", description: "Nutrient-dense meals with the extra calories you need." },
  { id: "Weight Maintenance", description: "Balanced meals to help you hold steady at your goal." },
  { id: "Muscle Building", description: "High-protein meals built to support training and recovery." },
]

export const DIET_TYPES: DietType[] = ["Meat", "Fish", "Vegan", "Vegetarian", "Egg"]

export const ALLERGENS = [
  "Gluten", "Dairy", "Tree Nuts", "Peanuts", "Shellfish", "Soy", "Eggs", "Sesame",
]

export interface MenuItem {
  id: string
  name: string
  description: string
  slot: MealSlot
  dietTags: DietType[]
  allergenTags: string[]
  goalTags: Goal[]
  kcal: number
  protein: number
  price: number
  premium?: boolean
}

export const MENU_ITEMS: MenuItem[] = [
  { id: "b-oats", name: "Overnight Oats & Berries", description: "Rolled oats, oat milk, mixed berries, chia.", slot: "Breakfast", dietTags: ["Vegan", "Vegetarian", "Meat", "Fish", "Egg"], allergenTags: ["Gluten"], goalTags: ["Weight Loss", "Weight Maintenance"], kcal: 340, protein: 12, price: 4.20 },
  { id: "b-egg-wrap", name: "Egg White Veggie Wrap", description: "Egg white, spinach, peppers, wholemeal wrap.", slot: "Breakfast", dietTags: ["Egg", "Vegetarian", "Meat", "Fish"], allergenTags: ["Gluten", "Eggs"], goalTags: ["Muscle Building", "Weight Maintenance"], kcal: 410, protein: 28, price: 4.60 },
  { id: "b-protein-pancakes", name: "Protein Pancakes", description: "Whey-boosted pancakes, banana, honey.", slot: "Breakfast", dietTags: ["Vegetarian", "Meat", "Fish", "Egg"], allergenTags: ["Gluten", "Dairy", "Eggs"], goalTags: ["Weight Gain", "Muscle Building"], kcal: 560, protein: 34, price: 5.10, premium: true },
  { id: "b-tofu-scramble", name: "Tofu Scramble & Avocado", description: "Turmeric tofu scramble, avocado, sourdough.", slot: "Breakfast", dietTags: ["Vegan", "Vegetarian"], allergenTags: ["Gluten", "Soy"], goalTags: ["Weight Loss", "Muscle Building"], kcal: 420, protein: 22, price: 4.90 },

  { id: "l-chicken-rice", name: "Grilled Chicken & Rice Bowl", description: "Grilled chicken breast, jasmine rice, broccoli.", slot: "Lunch", dietTags: ["Meat"], allergenTags: [], goalTags: ["Muscle Building", "Weight Maintenance"], kcal: 620, protein: 48, price: 6.40 },
  { id: "l-salmon-quinoa", name: "Salmon & Quinoa Salad", description: "Pan-seared salmon, quinoa, roast veg, lemon dressing.", slot: "Lunch", dietTags: ["Fish"], allergenTags: ["Fish"], goalTags: ["Muscle Building", "Weight Maintenance"], kcal: 590, protein: 42, price: 7.20, premium: true },
  { id: "l-chickpea-bowl", name: "Chickpea & Roast Veg Bowl", description: "Spiced chickpeas, sweet potato, kale, tahini.", slot: "Lunch", dietTags: ["Vegan", "Vegetarian"], allergenTags: ["Sesame"], goalTags: ["Weight Loss", "Weight Maintenance"], kcal: 480, protein: 18, price: 5.60 },
  { id: "l-turkey-wrap", name: "Turkey & Avocado Wrap", description: "Sliced turkey, avocado, spinach, wholemeal wrap.", slot: "Lunch", dietTags: ["Meat"], allergenTags: ["Gluten"], goalTags: ["Weight Loss", "Muscle Building"], kcal: 450, protein: 34, price: 5.90 },
  { id: "l-paneer-curry", name: "Paneer & Spinach Curry", description: "Paneer, spinach, brown rice, light curry sauce.", slot: "Lunch", dietTags: ["Vegetarian", "Egg"], allergenTags: ["Dairy"], goalTags: ["Weight Gain", "Weight Maintenance"], kcal: 540, protein: 26, price: 6.10 },

  { id: "d-steak-veg", name: "Sirloin Steak & Greens", description: "Grilled sirloin, garlic greens, sweet potato mash.", slot: "Dinner", dietTags: ["Meat"], allergenTags: [], goalTags: ["Muscle Building", "Weight Gain"], kcal: 680, protein: 50, price: 8.40, premium: true },
  { id: "d-cod-veg", name: "Baked Cod & Root Veg", description: "Baked cod fillet, roasted root vegetables, herb oil.", slot: "Dinner", dietTags: ["Fish"], allergenTags: ["Fish"], goalTags: ["Weight Loss", "Weight Maintenance"], kcal: 460, protein: 38, price: 7.10 },
  { id: "d-lentil-dahl", name: "Red Lentil Dahl", description: "Red lentil dahl, brown rice, coriander.", slot: "Dinner", dietTags: ["Vegan", "Vegetarian"], allergenTags: [], goalTags: ["Weight Loss", "Weight Maintenance"], kcal: 430, protein: 20, price: 5.20 },
  { id: "d-egg-fried-rice", name: "Egg Fried Rice & Veg", description: "Egg, jasmine rice, mixed vegetables, soy.", slot: "Dinner", dietTags: ["Egg", "Vegetarian"], allergenTags: ["Eggs", "Soy"], goalTags: ["Weight Maintenance", "Weight Gain"], kcal: 520, protein: 22, price: 5.80 },
  { id: "d-chicken-pasta", name: "Chicken & Pesto Pasta", description: "Grilled chicken, wholewheat pasta, basil pesto.", slot: "Dinner", dietTags: ["Meat"], allergenTags: ["Gluten", "Dairy", "Tree Nuts"], goalTags: ["Weight Gain", "Muscle Building"], kcal: 640, protein: 44, price: 7.60, premium: true },
]

export function defaultMenuFor(goal: Goal, diet: DietType, allergens: string[], slot: MealSlot): MenuItem {
  const excludeAllergens = new Set(allergens)
  const pool = MENU_ITEMS.filter(
    (item) =>
      item.slot === slot &&
      item.dietTags.includes(diet) &&
      !item.allergenTags.some((a) => excludeAllergens.has(a))
  )
  const goalMatch = pool.find((item) => item.goalTags.includes(goal))
  return goalMatch ?? pool[0] ?? MENU_ITEMS.find((item) => item.slot === slot)!
}

export function menuOptionsFor(diet: DietType, allergens: string[], slot: MealSlot): MenuItem[] {
  const excludeAllergens = new Set(allergens)
  return MENU_ITEMS.filter(
    (item) =>
      item.slot === slot &&
      item.dietTags.includes(diet) &&
      !item.allergenTags.some((a) => excludeAllergens.has(a))
  )
}

export const SLOTS_BY_MEALS_PER_DAY: Record<1 | 2 | 3, MealSlot[]> = {
  1: ["Lunch"],
  2: ["Breakfast", "Dinner"],
  3: ["Breakfast", "Lunch", "Dinner"],
}
