import type { DietType, Goal, MealSlot } from "@/data/menu"
import type { OrderStatus } from "@/lib/subscription"
import type { DeliverySlot, PlanTier } from "@/lib/subscribe-context"

// Mirrors server/src/lib/enums.ts (labels) and the Prisma schema enums (values) — the
// backend speaks WEIGHT_LOSS/MEAT/BREAKFAST, the frontend speaks "Weight Loss"/"Meat"/"Breakfast".
export const GOAL_TO_ENUM: Record<Goal, string> = {
  "Weight Loss": "WEIGHT_LOSS",
  "Weight Gain": "WEIGHT_GAIN",
  "Weight Maintenance": "WEIGHT_MAINTENANCE",
  "Muscle Building": "MUSCLE_BUILDING",
}

export const DIET_TO_ENUM: Record<DietType, string> = {
  Meat: "MEAT",
  Fish: "FISH",
  Vegan: "VEGAN",
  Vegetarian: "VEGETARIAN",
  Egg: "EGG",
}

export const MEAL_SLOT_TO_ENUM: Record<MealSlot, string> = {
  Breakfast: "BREAKFAST",
  Lunch: "LUNCH",
  Dinner: "DINNER",
}

export const DELIVERY_SLOT_TO_ENUM: Record<DeliverySlot, string> = {
  Daily: "DAILY",
  Weekly: "WEEKLY",
  "Alternate days": "ALTERNATE",
}

export const TIER_TO_ENUM: Record<PlanTier, string> = {
  Basic: "BASIC",
  Advanced: "ADVANCED",
}

const ENUM_TO_GOAL = Object.fromEntries(Object.entries(GOAL_TO_ENUM).map(([k, v]) => [v, k])) as Record<string, Goal>
const ENUM_TO_DIET = Object.fromEntries(Object.entries(DIET_TO_ENUM).map(([k, v]) => [v, k])) as Record<string, DietType>
const ENUM_TO_MEAL_SLOT = Object.fromEntries(Object.entries(MEAL_SLOT_TO_ENUM).map(([k, v]) => [v, k])) as Record<string, MealSlot>
const ENUM_TO_DELIVERY_SLOT = Object.fromEntries(Object.entries(DELIVERY_SLOT_TO_ENUM).map(([k, v]) => [v, k])) as Record<string, DeliverySlot>

export function goalFromEnum(value: string): Goal {
  return ENUM_TO_GOAL[value]
}

export function dietFromEnum(value: string): DietType {
  return ENUM_TO_DIET[value]
}

export function dietTypesFromEnum(values: string[]): DietType[] {
  return values.map(dietFromEnum)
}

export function mealSlotFromEnum(value: string): MealSlot {
  return ENUM_TO_MEAL_SLOT[value] ?? value as MealSlot
}

export function deliverySlotFromEnum(value: string): DeliverySlot {
  return ENUM_TO_DELIVERY_SLOT[value] ?? "Daily"
}

const ORDER_STATUS_FROM_ENUM: Record<string, OrderStatus> = {
  SCHEDULED: "Scheduled",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  ATTEMPTED: "Attempted",
  PAUSED: "Paused",
}

export function orderStatusFromEnum(value: string): OrderStatus {
  return ORDER_STATUS_FROM_ENUM[value] ?? "Scheduled"
}

export type BackendSubscriptionStatus = "PENDING_PAYMENT" | "ACTIVE" | "EXPIRED"

export function subscriptionStatusFromEnum(value: BackendSubscriptionStatus): "active" | "expired" {
  return value === "EXPIRED" ? "expired" : "active"
}
