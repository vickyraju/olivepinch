import { fileURLToPath } from "node:url"

// ponytail: PNG/JPEG only (the two formats an admin's phone/browser will actually
// produce for a menu photo). Add GIF/WEBP parsing here if that ever changes.
export function getImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length >= 24 && buffer.readUInt32BE(0) === 0x89504e47 && buffer.readUInt32BE(4) === 0x0d0a1a0a) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  }

  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2
    while (offset + 9 <= buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset++
        continue
      }
      const marker = buffer[offset + 1]
      const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
      if (isSOF) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) }
      }
      offset += 2 + buffer.readUInt16BE(offset + 2)
    }
  }

  return null
}

function buildFakePng(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24)
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
  buf.write("IHDR", 12)
  buf.writeUInt32BE(width, 16)
  buf.writeUInt32BE(height, 20)
  return buf
}

function buildFakeJpeg(width: number, height: number): Buffer {
  const buf = Buffer.alloc(11)
  buf[0] = 0xff
  buf[1] = 0xd8 // SOI
  buf[2] = 0xff
  buf[3] = 0xc0 // SOF0
  buf.writeUInt16BE(9, 4) // segment length (not counting the FFC0 marker itself)
  buf[6] = 8 // precision
  buf.writeUInt16BE(height, 7)
  buf.writeUInt16BE(width, 9)
  return buf
}

function demo() {
  console.assert(JSON.stringify(getImageDimensions(buildFakePng(1200, 800))) === JSON.stringify({ width: 1200, height: 800 }), "png dims")
  console.assert(JSON.stringify(getImageDimensions(buildFakeJpeg(1200, 800))) === JSON.stringify({ width: 1200, height: 800 }), "jpeg dims")
  console.assert(getImageDimensions(Buffer.from("not an image")) === null, "garbage input")
  console.log("image-dimensions self-check passed")
}

if (process.argv[1] === fileURLToPath(import.meta.url)) demo()
