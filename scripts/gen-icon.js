/**
 * SVG → PNG → ICO 변환 스크립트
 * 실행: node scripts/gen-icon.js
 */
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '../resources/icon.svg')
const OUT_PNG = path.join(__dirname, '../resources/icon.png')
const OUT_ICO = path.join(__dirname, '../resources/icon.ico')

async function main() {
  const svgBuf = fs.readFileSync(SRC)

  // 512x512 PNG
  await sharp(svgBuf).resize(512, 512).png().toFile(OUT_PNG)
  console.log('✓ icon.png')

  // ICO = multi-size PNG concatenated in ICO container
  // sizes required: 16, 32, 48, 64, 128, 256
  const sizes = [16, 32, 48, 64, 128, 256]
  const pngBuffers = await Promise.all(
    sizes.map(s => sharp(svgBuf).resize(s, s).png().toBuffer())
  )

  fs.writeFileSync(OUT_ICO, buildIco(pngBuffers, sizes))
  console.log('✓ icon.ico')
}

/** Minimal ICO builder (PNG-inside-ICO format) */
function buildIco(pngBuffers, sizes) {
  const count = pngBuffers.length
  const headerSize = 6
  const dirEntrySize = 16
  const dirSize = headerSize + dirEntrySize * count

  let imageOffset = dirSize
  const offsets = pngBuffers.map(buf => {
    const off = imageOffset
    imageOffset += buf.length
    return off
  })

  const totalSize = dirSize + pngBuffers.reduce((s, b) => s + b.length, 0)
  const buf = Buffer.alloc(totalSize)

  // ICONDIR header
  buf.writeUInt16LE(0, 0)       // reserved
  buf.writeUInt16LE(1, 2)       // type: ICO
  buf.writeUInt16LE(count, 4)   // image count

  // ICONDIRENTRY per image
  pngBuffers.forEach((png, i) => {
    const base = headerSize + dirEntrySize * i
    const s = sizes[i]
    buf.writeUInt8(s >= 256 ? 0 : s, base)      // width  (0 = 256)
    buf.writeUInt8(s >= 256 ? 0 : s, base + 1)  // height (0 = 256)
    buf.writeUInt8(0, base + 2)   // color count
    buf.writeUInt8(0, base + 3)   // reserved
    buf.writeUInt16LE(1, base + 4)  // planes
    buf.writeUInt16LE(32, base + 6) // bit count
    buf.writeUInt32LE(png.length, base + 8)   // size
    buf.writeUInt32LE(offsets[i], base + 12)  // offset
  })

  // Image data
  let pos = dirSize
  for (const png of pngBuffers) {
    png.copy(buf, pos)
    pos += png.length
  }

  return buf
}

main().catch(e => { console.error(e); process.exit(1) })
