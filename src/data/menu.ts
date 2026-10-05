export type Style = "Little" | "Hearty" | "Classic" | "Charged"
export type DietType = "Meat" | "Fish" | "Vegan" | "Vegetarian" | "Egg"
export type MealSlot = "Box1" | "Box2" | "Box3"

export const GOALS: { id: Style; description: string }[] = [
  { id: "Little", description: "Smaller portions, calorie-conscious and easy on the plate." },
  { id: "Hearty", description: "Bigger portions with extra calories." },
  { id: "Classic", description: "Varied, balanced meals for everyday eating." },
  { id: "Charged", description: "Meals with a higher protein content." },
]

export const GOAL_PHOTOS: Record<Style, string> = {
  Little: "/images/goal-weight-loss.jpg",
  Hearty: "/images/goal-weight-gain.jpg",
  Classic: "/images/goal-weight-maintenance.jpg",
  Charged: "/images/goal-muscle-building.jpg",
}

export const MENU_ITEM_PHOTOS: Record<string, string> = {
  "b-oats": "/images/menu-b-oats.jpg",
  "b-egg-wrap": "/images/menu-b-egg-wrap.jpg",
  "b-protein-pancakes": "/images/goal-muscle-building.jpg",
  "b-tofu-scramble": "/images/menu-b-tofu-scramble.jpg",
  "l-chicken-rice": "/images/hero-1.jpg",
  "l-salmon-quinoa": "/images/hero-2.jpg",
  "l-chickpea-bowl": "/images/goal-weight-loss.jpg",
  "l-turkey-wrap": "/images/cta-accent.jpg",
  "l-paneer-curry": "/images/menu-l-paneer-curry.jpg",
  "d-steak-veg": "/images/goal-weight-gain.jpg",
  "d-cod-veg": "/images/goal-weight-maintenance.jpg",
  "d-lentil-dahl": "/images/about-2.jpg",
  "d-egg-fried-rice": "/images/menu-d-egg-fried-rice.jpg",
  "d-chicken-pasta": "/images/menu-d-chicken-pasta.jpg",
}

export const DIET_TYPES: DietType[] = ["Meat", "Fish", "Vegan", "Vegetarian", "Egg"]

export interface MenuItem {
  id: string
  name: string
  description: string
  slot: MealSlot
  dietTags: DietType[]
  allergenTags: string[]
  goalTags: Style[]
  kcal: number
  protein: number
  price: number
  premium?: boolean
}

export const MENU_ITEMS: MenuItem[] = [
  { id: "b-oats", name: "Overnight Oats & Berries", description: "Rolled oats, oat milk, mixed berries, chia.", slot: "Box1", dietTags: ["Vegan", "Vegetarian", "Meat", "Fish", "Egg"], allergenTags: ["Gluten"], goalTags: ["Little", "Classic"], kcal: 340, protein: 12, price: 4.20 },
  { id: "b-egg-wrap", name: "Egg White Veggie Wrap", description: "Egg white, spinach, peppers, wholemeal wrap.", slot: "Box1", dietTags: ["Egg", "Vegetarian", "Meat", "Fish"], allergenTags: ["Gluten", "Eggs"], goalTags: ["Charged", "Classic"], kcal: 410, protein: 28, price: 4.60 },
  { id: "b-protein-pancakes", name: "Protein Pancakes", description: "Whey-boosted pancakes, banana, honey.", slot: "Box1", dietTags: ["Vegetarian", "Meat", "Fish", "Egg"], allergenTags: ["Gluten", "Dairy", "Eggs"], goalTags: ["Hearty", "Charged"], kcal: 560, protein: 34, price: 5.10, premium: true },
  { id: "b-tofu-scramble", name: "Tofu Scramble & Avocado", description: "Turmeric tofu scramble, avocado, sourdough.", slot: "Box1", dietTags: ["Vegan", "Vegetarian"], allergenTags: ["Gluten", "Soy"], goalTags: ["Little", "Charged"], kcal: 420, protein: 22, price: 4.90 },

  { id: "l-chicken-rice", name: "Grilled Chicken & Rice Bowl", description: "Grilled chicken breast, jasmine rice, broccoli.", slot: "Box2", dietTags: ["Meat"], allergenTags: [], goalTags: ["Charged", "Classic"], kcal: 620, protein: 48, price: 6.40 },
  { id: "l-salmon-quinoa", name: "Salmon & Quinoa Salad", description: "Pan-seared salmon, quinoa, roast veg, lemon dressing.", slot: "Box2", dietTags: ["Fish"], allergenTags: ["Fish"], goalTags: ["Charged", "Classic"], kcal: 590, protein: 42, price: 7.20, premium: true },
  { id: "l-chickpea-bowl", name: "Chickpea & Roast Veg Bowl", description: "Spiced chickpeas, sweet potato, kale, tahini.", slot: "Box2", dietTags: ["Vegan", "Vegetarian"], allergenTags: ["Sesame"], goalTags: ["Little", "Classic"], kcal: 480, protein: 18, price: 5.60 },
  { id: "l-turkey-wrap", name: "Turkey & Avocado Wrap", description: "Sliced turkey, avocado, spinach, wholemeal wrap.", slot: "Box2", dietTags: ["Meat"], allergenTags: ["Gluten"], goalTags: ["Little", "Charged"], kcal: 450, protein: 34, price: 5.90 },
  { id: "l-paneer-curry", name: "Paneer & Spinach Curry", description: "Paneer, spinach, brown rice, light curry sauce.", slot: "Box2", dietTags: ["Vegetarian", "Egg"], allergenTags: ["Dairy"], goalTags: ["Hearty", "Classic"], kcal: 540, protein: 26, price: 6.10 },

  { id: "d-steak-veg", name: "Sirloin Steak & Greens", description: "Grilled sirloin, garlic greens, sweet potato mash.", slot: "Box3", dietTags: ["Meat"], allergenTags: [], goalTags: ["Charged", "Hearty"], kcal: 680, protein: 50, price: 8.40, premium: true },
  { id: "d-cod-veg", name: "Baked Cod & Root Veg", description: "Baked cod fillet, roasted root vegetables, herb oil.", slot: "Box3", dietTags: ["Fish"], allergenTags: ["Fish"], goalTags: ["Little", "Classic"], kcal: 460, protein: 38, price: 7.10 },
  { id: "d-lentil-dahl", name: "Red Lentil Dahl", description: "Red lentil dahl, brown rice, coriander.", slot: "Box3", dietTags: ["Vegan", "Vegetarian"], allergenTags: [], goalTags: ["Little", "Classic"], kcal: 430, protein: 20, price: 5.20 },
  { id: "d-egg-fried-rice", name: "Egg Fried Rice & Veg", description: "Egg, jasmine rice, mixed vegetables, soy.", slot: "Box3", dietTags: ["Egg", "Vegetarian"], allergenTags: ["Eggs", "Soy"], goalTags: ["Classic", "Hearty"], kcal: 520, protein: 22, price: 5.80 },
  { id: "d-chicken-pasta", name: "Chicken & Pesto Pasta", description: "Grilled chicken, wholewheat pasta, basil pesto.", slot: "Box3", dietTags: ["Meat"], allergenTags: ["Gluten", "Dairy", "Tree Nuts"], goalTags: ["Hearty", "Charged"], kcal: 640, protein: 44, price: 7.60, premium: true },
]

export function defaultMenuFor(goal: Style, diets: DietType[], allergens: string[], slot: MealSlot): MenuItem {
  const excludeAllergens = new Set(allergens)
  const pool = MENU_ITEMS.filter(
    (item) =>
      item.slot === slot &&
      item.dietTags.some((tag) => diets.includes(tag)) &&
      !item.allergenTags.some((a) => excludeAllergens.has(a))
  )
  const goalMatch = pool.find((item) => item.goalTags.includes(goal))
  return goalMatch ?? pool[0] ?? MENU_ITEMS.find((item) => item.slot === slot)!
}

export function menuOptionsFor(diets: DietType[], allergens: string[], slot: MealSlot): MenuItem[] {
  const excludeAllergens = new Set(allergens)
  return MENU_ITEMS.filter(
    (item) =>
      item.slot === slot &&
      item.dietTags.some((tag) => diets.includes(tag)) &&
      !item.allergenTags.some((a) => excludeAllergens.has(a))
  )
}

export const SLOTS_BY_MEALS_PER_DAY: Record<1 | 2 | 3, MealSlot[]> = {
  1: ["Box2"],
  2: ["Box1", "Box3"],
  3: ["Box1", "Box2", "Box3"],
}
