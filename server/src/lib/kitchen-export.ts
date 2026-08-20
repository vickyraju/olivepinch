import ExcelJS from "exceljs"
import { prisma } from "./prisma.js"

interface Bucket {
  date: string
  slot: string
  itemName: string
  portionsNeeded: number
}

const SLOT_FILL: Record<string, string> = {
  BREAKFAST: "FFFDE9C8", // pale amber
  LUNCH: "FFD6E4F0", // pale blue
  DINNER: "FFE6DCF0", // pale lavender
}

// Manual Map-bucketing rather than a Prisma groupBy, matching this codebase's existing
// aggregation style (see revenue.ts) — a relation-filtered groupBy has zero precedent here.
async function aggregate(from: string, to: string): Promise<Bucket[]> {
  const orders = await prisma.order.findMany({
    where: {
      deliveryDate: { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T00:00:00.000Z`) },
      status: { not: "PAUSED" }, // paused orders keep their OrderItem rows but need no food
    },
    include: { items: { include: { menuItem: true } } },
  })

  const buckets = new Map<string, Bucket>()
  for (const order of orders) {
    const date = order.deliveryDate.toISOString().slice(0, 10)
    for (const item of order.items) {
      const key = `${date}::${item.menuItemId}`
      const existing = buckets.get(key)
      if (existing) {
        existing.portionsNeeded++
      } else {
        buckets.set(key, {
          date,
          slot: item.slot,
          itemName: item.menuItem.name,
          portionsNeeded: 1,
        })
      }
    }
  }

  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot) || a.itemName.localeCompare(b.itemName))
}

export async function buildKitchenExportWorkbook(from: string, to: string): Promise<ExcelJS.Workbook> {
  const rows = await aggregate(from, to)

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Kitchen prep")
  sheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Meal Slot", key: "slot", width: 14 },
    { header: "Item", key: "item", width: 32 },
    { header: "Portions Needed", key: "portions", width: 18 },
  ]

  const headerRow = sheet.getRow(1)
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3F4F1F" } } // dark olive
  })

  for (const row of rows) {
    const excelRow = sheet.addRow({
      date: row.date,
      slot: row.slot,
      item: row.itemName,
      portions: row.portionsNeeded,
    })
    const fill = SLOT_FILL[row.slot]
    if (fill) {
      excelRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } }
      })
    }
  }

  return workbook
}
