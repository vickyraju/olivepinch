import ExcelJS from "exceljs"
import { prisma } from "./prisma.js"

interface Row {
  date: string
  slot: string
  itemName: string
  customerName: string
  type: string
}

const SLOT_FILL: Record<string, string> = {
  BREAKFAST: "FFFDE9C8", // pale amber
  LUNCH: "FFD6E4F0", // pale blue
  DINNER: "FFE6DCF0", // pale lavender
}

const TIER_LABELS: Record<string, string> = {
  BASIC: "Basic",
  ADVANCED: "Advanced",
}

async function buildRows(from: string, to: string): Promise<Row[]> {
  const orders = await prisma.order.findMany({
    where: {
      deliveryDate: { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T00:00:00.000Z`) },
      status: { not: "PAUSED" }, // paused orders keep their OrderItem rows but need no food
    },
    include: { subscription: { include: { customer: true } }, items: { include: { menuItem: true } } },
  })

  const rows: Row[] = []
  for (const order of orders) {
    const date = order.deliveryDate.toISOString().slice(0, 10)
    for (const item of order.items) {
      rows.push({
        date,
        slot: item.slot,
        itemName: item.menuItem.name,
        customerName: order.subscription.customer.fullName,
        type: TIER_LABELS[order.subscription.tier] ?? order.subscription.tier,
      })
    }
  }

  return rows.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.slot.localeCompare(b.slot) ||
      a.itemName.localeCompare(b.itemName) ||
      a.customerName.localeCompare(b.customerName)
  )
}

export async function buildKitchenExportWorkbook(from: string, to: string): Promise<ExcelJS.Workbook> {
  const rows = await buildRows(from, to)

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Kitchen prep")
  sheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Meal Slot", key: "slot", width: 14 },
    { header: "Item", key: "item", width: 32 },
    { header: "Customer Name", key: "customerName", width: 24 },
    { header: "Type", key: "type", width: 12 },
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
      customerName: row.customerName,
      type: row.type,
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
