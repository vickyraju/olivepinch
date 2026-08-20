import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const MENU_ITEMS = [
  { id: "b-oats", name: "Overnight Oats & Berries", description: "Rolled oats, oat milk, mixed berries, chia.", slot: "BREAKFAST", dietTags: ["VEGAN", "VEGETARIAN", "MEAT", "FISH", "EGG"], allergenTags: ["Gluten"], goalTags: ["WEIGHT_LOSS", "WEIGHT_MAINTENANCE"], kcal: 340, protein: 12 },
  { id: "b-egg-wrap", name: "Egg White Veggie Wrap", description: "Egg white, spinach, peppers, wholemeal wrap.", slot: "BREAKFAST", dietTags: ["EGG", "VEGETARIAN", "MEAT", "FISH"], allergenTags: ["Gluten", "Eggs"], goalTags: ["MUSCLE_BUILDING", "WEIGHT_MAINTENANCE"], kcal: 410, protein: 28 },
  { id: "b-protein-pancakes", name: "Protein Pancakes", description: "Whey-boosted pancakes, banana, honey.", slot: "BREAKFAST", dietTags: ["VEGETARIAN", "MEAT", "FISH", "EGG"], allergenTags: ["Gluten", "Dairy", "Eggs"], goalTags: ["WEIGHT_GAIN", "MUSCLE_BUILDING"], kcal: 560, protein: 34 },
  { id: "b-tofu-scramble", name: "Tofu Scramble & Avocado", description: "Turmeric tofu scramble, avocado, sourdough.", slot: "BREAKFAST", dietTags: ["VEGAN", "VEGETARIAN"], allergenTags: ["Gluten", "Soy"], goalTags: ["WEIGHT_LOSS", "MUSCLE_BUILDING"], kcal: 420, protein: 22 },

  { id: "l-chicken-rice", name: "Grilled Chicken & Rice Bowl", description: "Grilled chicken breast, jasmine rice, broccoli.", slot: "LUNCH", dietTags: ["MEAT"], allergenTags: [], goalTags: ["MUSCLE_BUILDING", "WEIGHT_MAINTENANCE"], kcal: 620, protein: 48 },
  { id: "l-salmon-quinoa", name: "Salmon & Quinoa Salad", description: "Pan-seared salmon, quinoa, roast veg, lemon dressing.", slot: "LUNCH", dietTags: ["FISH"], allergenTags: ["Fish"], goalTags: ["MUSCLE_BUILDING", "WEIGHT_MAINTENANCE"], kcal: 590, protein: 42 },
  { id: "l-chickpea-bowl", name: "Chickpea & Roast Veg Bowl", description: "Spiced chickpeas, sweet potato, kale, tahini.", slot: "LUNCH", dietTags: ["VEGAN", "VEGETARIAN"], allergenTags: ["Sesame"], goalTags: ["WEIGHT_LOSS", "WEIGHT_MAINTENANCE"], kcal: 480, protein: 18 },
  { id: "l-turkey-wrap", name: "Turkey & Avocado Wrap", description: "Sliced turkey, avocado, spinach, wholemeal wrap.", slot: "LUNCH", dietTags: ["MEAT"], allergenTags: ["Gluten"], goalTags: ["WEIGHT_LOSS", "MUSCLE_BUILDING"], kcal: 450, protein: 34 },
  { id: "l-paneer-curry", name: "Paneer & Spinach Curry", description: "Paneer, spinach, brown rice, light curry sauce.", slot: "LUNCH", dietTags: ["VEGETARIAN", "EGG"], allergenTags: ["Dairy"], goalTags: ["WEIGHT_GAIN", "WEIGHT_MAINTENANCE"], kcal: 540, protein: 26 },

  { id: "d-steak-veg", name: "Sirloin Steak & Greens", description: "Grilled sirloin, garlic greens, sweet potato mash.", slot: "DINNER", dietTags: ["MEAT"], allergenTags: [], goalTags: ["MUSCLE_BUILDING", "WEIGHT_GAIN"], kcal: 680, protein: 50 },
  { id: "d-cod-veg", name: "Baked Cod & Root Veg", description: "Baked cod fillet, roasted root vegetables, herb oil.", slot: "DINNER", dietTags: ["FISH"], allergenTags: ["Fish"], goalTags: ["WEIGHT_LOSS", "WEIGHT_MAINTENANCE"], kcal: 460, protein: 38 },
  { id: "d-lentil-dahl", name: "Red Lentil Dahl", description: "Red lentil dahl, brown rice, coriander.", slot: "DINNER", dietTags: ["VEGAN", "VEGETARIAN"], allergenTags: [], goalTags: ["WEIGHT_LOSS", "WEIGHT_MAINTENANCE"], kcal: 430, protein: 20 },
  { id: "d-egg-fried-rice", name: "Egg Fried Rice & Veg", description: "Egg, jasmine rice, mixed vegetables, soy.", slot: "DINNER", dietTags: ["EGG", "VEGETARIAN"], allergenTags: ["Eggs", "Soy"], goalTags: ["WEIGHT_MAINTENANCE", "WEIGHT_GAIN"], kcal: 520, protein: 22 },
  { id: "d-chicken-pasta", name: "Chicken & Pesto Pasta", description: "Grilled chicken, wholewheat pasta, basil pesto.", slot: "DINNER", dietTags: ["MEAT"], allergenTags: ["Gluten", "Dairy", "Tree Nuts"], goalTags: ["WEIGHT_GAIN", "MUSCLE_BUILDING"], kcal: 640, protein: 44 },
] as const

// Plan-based/goal-based pricing seed — mirrors the plan durations (7/14/28 days) and goals
// already offered in the subscribe funnel (src/pages/subscribe/plan.tsx, goal.tsx). Flat
// price per (days, goal); longer plans get a small per-day discount. Admin can edit anytime.
const PLANS = [
  { goal: "WEIGHT_LOSS", planDuration: 7, price: 74.99 },
  { goal: "WEIGHT_LOSS", planDuration: 14, price: 139.99 },
  { goal: "WEIGHT_LOSS", planDuration: 28, price: 259.99 },
  { goal: "WEIGHT_MAINTENANCE", planDuration: 7, price: 79.99 },
  { goal: "WEIGHT_MAINTENANCE", planDuration: 14, price: 149.99 },
  { goal: "WEIGHT_MAINTENANCE", planDuration: 28, price: 279.99 },
  { goal: "WEIGHT_GAIN", planDuration: 7, price: 84.99 },
  { goal: "WEIGHT_GAIN", planDuration: 14, price: 159.99 },
  { goal: "WEIGHT_GAIN", planDuration: 28, price: 299.99 },
  { goal: "MUSCLE_BUILDING", planDuration: 7, price: 89.99 },
  { goal: "MUSCLE_BUILDING", planDuration: 14, price: 169.99 },
  { goal: "MUSCLE_BUILDING", planDuration: 28, price: 319.99 },
] as const

async function main() {
  for (const item of MENU_ITEMS) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: item as never,
      create: item as never,
    })
  }

  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { planDuration_goal: { planDuration: plan.planDuration, goal: plan.goal as never } },
      update: { price: plan.price },
      create: plan as never,
    })
  }

  await prisma.zone.upsert({
    where: { id: "zone-birmingham" },
    update: {},
    create: { id: "zone-birmingham", name: "Birmingham", postcodePrefixes: ["B"], isActive: true },
  })

  const adminEmail = "admin@olivepinch.co.uk"
  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Pilot Admin",
      passwordHash: await bcrypt.hash("ChangeMe123!", 12),
    },
  })

  console.log(`Seeded ${MENU_ITEMS.length} menu items, ${PLANS.length} plans, 1 zone, and 1 admin user (${adminEmail} / ChangeMe123!).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
