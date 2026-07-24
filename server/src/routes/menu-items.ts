import { Router } from "express"
import { prisma } from "../lib/prisma.js"

export const menuItemsRouter = Router()

menuItemsRouter.get("/", async (_req, res) => {
  const items = await prisma.menuItem.findMany({ orderBy: { slot: "asc" } })
  res.json(items)
})
