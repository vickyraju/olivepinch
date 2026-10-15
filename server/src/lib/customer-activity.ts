import { prisma } from "./prisma.js"

// Records something a customer did to their own account so an admin can see it. Best-effort: a
// logging failure must never fail the customer's request.
export async function logCustomerActivity(customerId: string, action: string, detail?: string) {
  try {
    await prisma.customerActivity.create({ data: { customerId, action, detail } })
  } catch (err) {
    console.error("customer activity log failed", action, err)
  }
}

// "Door: 12 -> 14; Postcode: B1 1AA -> B2 2BB" for the fields that really changed.
export function describeChanges(labels: Record<string, string>, before: Record<string, unknown>, after: Record<string, unknown>): string {
  return Object.entries(labels)
    .filter(([key]) => (before[key] ?? "") !== (after[key] ?? ""))
    .map(([key, label]) => `${label}: ${before[key] || "(empty)"} -> ${after[key] || "(empty)"}`)
    .join("; ")
}
