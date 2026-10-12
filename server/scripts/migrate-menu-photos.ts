// One-off: converts menu photos stored as base64 data URLs into optimised files in Supabase Storage.
// Run once after SUPABASE_SERVICE_ROLE_KEY is set: `npx tsx scripts/migrate-menu-photos.ts`
import { prisma } from "../src/lib/prisma.js"
import { isPhotoDataUrl, storeMenuPhoto } from "../src/lib/menu-photos.js"

const items = await prisma.menuItem.findMany({ select: { id: true, name: true, photoUrl: true } })
let converted = 0
for (const item of items) {
  if (!isPhotoDataUrl(item.photoUrl)) continue
  const photoUrl = await storeMenuPhoto(item.photoUrl)
  await prisma.menuItem.update({ where: { id: item.id }, data: { photoUrl } })
  converted++
  console.log(`converted ${item.name}`)
}
console.log(`Done: ${converted} of ${items.length} menu items converted.`)
await prisma.$disconnect()
