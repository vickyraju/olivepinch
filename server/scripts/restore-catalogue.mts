// Loads the menu catalogue (menu items, weekly menus, plans, promo codes, zones, delivery windows, allergens)
// and the menu photos from a backup folder into an EMPTY database, pointing each item at the photo served from this
// server. Customer data is never restored.
// Usage (from server/):
//   BACKUP_DIR=~/olivepinch-catalogue-backup UPLOAD_DIR=/var/www/olivepinch/uploads UPLOADS_PUBLIC_URL=https://api.example.com/uploads \
//   npx tsx scripts/restore-catalogue.mts [--apply]
import fs from "node:fs"
import path from "node:path"
import { prisma } from "../src/lib/prisma.js"

const apply = process.argv.includes("--apply")
const dir = process.env.BACKUP_DIR!.replace(/^~/, process.env.HOME!)
const uploadDir = process.env.UPLOAD_DIR ?? "./uploads"
const publicUrl = (process.env.UPLOADS_PUBLIC_URL ?? "").replace(/\/$/, "")
if (!dir || !publicUrl) throw new Error("Set BACKUP_DIR and UPLOADS_PUBLIC_URL")

const read = <T = Record<string, unknown>>(name: string): T[] => JSON.parse(fs.readFileSync(path.join(dir, name + ".json"), "utf8"))
const data = {
  menuItems: read<{ photoUrl: string | null }>("menuItems"),
  menuWeeks: read("menuWeeks"),
  menuWeekItems: read("menuWeekItems"),
  plans: read("plans"),
  promoCodes: read("promoCodes"),
  zones: read("zones"),
  deliveryTimeSlots: read("deliveryTimeSlots"),
  allergens: read("allergens"),
}
for (const [k, v] of Object.entries(data)) console.log(k.padEnd(18), v.length)
const existing = (await prisma.menuItem.count()) + (await prisma.customer.count())
if (existing > 0) throw new Error("Database already has menu items or customers; restore is for a new, empty database only.")
const missing = data.menuItems.filter((m) => m.photoUrl && !fs.existsSync(path.join(dir, "photos", path.basename(new URL(m.photoUrl).pathname))))
if (missing.length) throw new Error(`${missing.length} photo file(s) missing from the backup`)
if (!apply) { console.log("Dry run OK. Add --apply to restore."); process.exit(0) }

fs.mkdirSync(uploadDir, { recursive: true })
for (const f of fs.readdirSync(path.join(dir, "photos"))) fs.copyFileSync(path.join(dir, "photos", f), path.join(uploadDir, f))
const items = data.menuItems.map((m) => ({ ...m, photoUrl: m.photoUrl ? `${publicUrl}/${path.basename(new URL(m.photoUrl).pathname)}` : null }))
const many = (rows: unknown[]) => ({ data: rows as never, skipDuplicates: false })
// Migrations pre-fill a starter set of allergens and delivery windows; the backup replaces them.
await prisma.$transaction([
  prisma.allergen.deleteMany(),
  prisma.deliveryTimeSlot.deleteMany(),
  prisma.allergen.createMany(many(data.allergens)),
  prisma.deliveryTimeSlot.createMany(many(data.deliveryTimeSlots)),
  prisma.zone.createMany(many(data.zones)),
  prisma.plan.createMany(many(data.plans)),
  prisma.promoCode.createMany(many(data.promoCodes)),
  prisma.menuItem.createMany(many(items)),
  prisma.menuWeek.createMany(many(data.menuWeeks)),
  prisma.menuWeekItem.createMany(many(data.menuWeekItems)),
])
console.log("Restored. Photos copied to", uploadDir)
await prisma.$disconnect()
