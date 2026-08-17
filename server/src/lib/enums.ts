import type { DietType, Goal, DeliverySlot } from "@prisma/client"

export const GOAL_LABELS: Record<Goal, string> = {
  WEIGHT_LOSS: "Weight Loss",
  WEIGHT_GAIN: "Weight Gain",
  WEIGHT_MAINTENANCE: "Weight Maintenance",
  MUSCLE_BUILDING: "Muscle Building",
}

export const DIET_LABELS: Record<DietType, string> = {
  MEAT: "Meat",
  FISH: "Fish",
  VEGAN: "Vegan",
  VEGETARIAN: "Vegetarian",
  EGG: "Egg",
}

export const DELIVERY_SLOT_LABELS: Record<DeliverySlot, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  ALTERNATE: "Alternate days",
}

export const GOAL_VALUES = Object.keys(GOAL_LABELS) as Goal[]
export const DIET_VALUES = Object.keys(DIET_LABELS) as DietType[]
export const DELIVERY_SLOT_VALUES = Object.keys(DELIVERY_SLOT_LABELS) as DeliverySlot[]
