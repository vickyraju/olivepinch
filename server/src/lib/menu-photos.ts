import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import sharp from "sharp"

// Menu cards are shown at most ~600px wide (2x for retina), so anything larger is wasted bytes.
const MAX_EDGE = 1200
const WEBP_QUALITY = 82
const DATA_URL = /^data:image\/[a-z0-9.+-]+;base64,(.+)$/i

// Any upload (any resolution, PNG/JPEG/WebP/GIF/AVIF) becomes an oriented, resized, lossy WebP.
export async function optimisePhoto(input: Buffer): Promise<Buffer> {
  return sharp(input, { limitInputPixels: 80_000_000 })
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()
}

// Photos are files on this server's disk, served by the API at /uploads (see app.ts).
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads"
const publicBase = () => (process.env.UPLOADS_PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4000}/uploads`).replace(/\/$/, "")

export async function uploadMenuPhoto(webp: Buffer): Promise<string> {
  const name = `${randomUUID()}.webp`
  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(join(UPLOAD_DIR, name), webp)
  return `${publicBase()}/${name}`
}

// Turns a submitted photo into a stored URL. Existing http(s) URLs pass through untouched.
export async function storeMenuPhoto(photo: string): Promise<string> {
  const match = DATA_URL.exec(photo)
  if (!match) return photo
  const optimised = await optimisePhoto(Buffer.from(match[1] as string, "base64"))
  return uploadMenuPhoto(optimised)
}

export function isPhotoDataUrl(photo: string | null | undefined): photo is string {
  return !!photo && DATA_URL.test(photo)
}
