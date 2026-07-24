import { Router } from "express"
import { adminAuthRouter } from "./auth.js"
import { adminMenuItemsRouter } from "./menu-items.js"
import { adminZonesRouter } from "./zones.js"
import { adminCustomersRouter } from "./customers.js"
import { adminRevenueRouter } from "./revenue.js"
import { adminOrdersRouter } from "./orders.js"

export const adminRouter = Router()

adminRouter.use("/auth", adminAuthRouter)
adminRouter.use("/menu-items", adminMenuItemsRouter)
adminRouter.use("/zones", adminZonesRouter)
adminRouter.use("/customers", adminCustomersRouter)
adminRouter.use("/revenue", adminRevenueRouter)
adminRouter.use("/orders", adminOrdersRouter)
