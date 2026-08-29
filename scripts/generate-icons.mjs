#!/usr/bin/env node
/**
 * 產生 PWA 圖示（public/icons/icon-*.png）。
 *
 * SPEC.md P3「純本地、零網路」要求字型與其他靜態資源都要 self-host，
 * 圖示自然也不例外，所以不透過任何線上工具或圖像函式庫產生——
 * 用 Node 內建的 zlib 手刻一個最小可用的 PNG encoder（單一 IDAT、無 filter
 * 以外的花招），畫一個深色背景＋置中淺色圓形的簡單「代幣」圖示。
 *
 * 圓的半徑抓在畫布的 32%（留下明顯留白），同一張圖同時當 `any` 與
 * `maskable` 兩種 purpose 使用也安全，不需要另外產生兩份檔案。
 *
 * 這是一次性工具，不在 `npm run verify` 流程內；圖示改版時重新執行即可：
 *   node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'public', 'icons')

const BG = [15, 23, 42] // #0f172a，與 index.html 的 theme-color 一致
const FG = [251, 191, 36] // #fbbf24，暖色系代幣

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0)
  return Buffer.concat([length, typeBytes, data, crc])
}

function drawIcon(size) {
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.32
  const raw = Buffer.alloc(size * (1 + size * 3)) // 每列前面一個 filter byte(0) + RGB

  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 3)
    raw[rowStart] = 0 // filter type 0（none）
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5
      const dy = y - cy + 0.5
      const inCircle = dx * dx + dy * dy <= radius * radius
      const color = inCircle ? FG : BG
      const px = rowStart + 1 + x * 3
      raw[px] = color[0]
      raw[px + 1] = color[1]
      raw[px + 2] = color[2]
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const idat = deflateSync(raw)

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  const png = drawIcon(size)
  const file = path.join(OUT_DIR, `icon-${size}.png`)
  writeFileSync(file, png)
  console.log(`wrote ${path.relative(process.cwd(), file)} (${png.length} bytes)`)
}
