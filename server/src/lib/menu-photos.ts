import { randomUUID } from "node:crypto"
import sharp from "sharp"

// Menu cards are shown at most ~600px wide (2x for retina), so anything larger is wasted bytes.
const MAX_EDGE = 1200
const WEBP_QUALITY = 82
const BUCKET = "menu-photos"
const DATA_URL = /^data:image\/[a-z0-9.+-]+;base64,(.+)$/i

// Any upload (any resolution, PNG/JPEG/WebP/GIF/AVIF) becomes an oriented, resized, lossy WebP.
export async function optimisePhoto(input: Buffer): Promise<Buffer> {
  return sharp(input, { limitInputPixels: 80_000_000 })
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()
}

function storageConfig() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw Object.assign(new Error("Photo storage is not configured"), { status: 501 })
  return { url, key }
}

async function ensureBucket(url: string, key: string) {
  const res = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  })
  // 409 means it already exists, which is fine.
  if (!res.ok && res.status !== 409) throw new Error(`Could not create photo bucket (${res.status})`)
}

export async function uploadMenuPhoto(webp: Buffer): Promise<string> {
  const { url, key } = storageConfig()
  const name = `${randomUUID()}.webp`
  const send = () =>
    fetch(`${url}/storage/v1/object/${BUCKET}/${name}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
      body: new Uint8Array(webp),
    })
  let res = await send()
  if (res.status === 404 || res.status === 400) {
    await ensureBucket(url, key)
    res = await send()
  }
  if (!res.ok) throw new Error(`Photo upload failed (${res.status})`)
  return `${url}/storage/v1/object/public/${BUCKET}/${name}`
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
