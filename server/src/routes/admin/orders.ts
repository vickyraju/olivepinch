import { Router } from "express"
import { requireAdminAuth } from "../../middleware/admin-auth.js"
import { buildKitchenExportWorkbook } from "../../lib/kitchen-export.js"

export const adminOrdersRouter = Router()
adminOrdersRouter.use(requireAdminAuth)

// Styled .xlsx for the kitchen: portions needed per item per day, colored by meal slot. A
// single-day export is just this same query with from === to, not a separate code path.
adminOrdersRouter.get("/kitchen-export", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const from = String(req.query.from ?? today)
  const to = String(req.query.to ?? from)

  const workbook = await buildKitchenExportWorkbook(from, to)
  const filename = from === to ? `kitchen-export-${from}.xlsx` : `kitchen-export-${from}-to-${to}.xlsx`

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
  await workbook.xlsx.write(res)
  res.end()
})
