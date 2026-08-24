/**
 * gen-icons.ts — สร้างชุด favicon จากไฟล์ SVG ต้นฉบับ
 *
 * รัน: npm run icons
 *
 * ทำไมต้องมีสคริปต์นี้แทนการใช้เว็บแปลงไฟล์:
 *   - แก้โลโก้ที่ public/favicon.svg ที่เดียว แล้วสั่งรันใหม่ ได้ครบทุกขนาด
 *     ไม่ต้องอัปโหลดไฟล์ไปเว็บนอกแล้วดาวน์โหลดกลับมาวางเองทีละไฟล์
 *   - ขนาดที่สร้างยึดตามเกณฑ์ Google Search: ต้องเป็นจัตุรัสขนาด 48px
 *     หรือทวีคูณของ 48 เท่านั้น ไฟล์ 32px ที่เคยใช้จะถูก Google มองข้าม
 *     แล้วขึ้นรูปลูกโลกแทน
 */

import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'node:fs'

const SOURCE = 'public/favicon.svg'

/** ขนาดที่ Google ยอมรับ (ทวีคูณของ 48) + 180 สำหรับ iOS home screen */
const SIZES = [48, 96, 192] as const
const APPLE_TOUCH_SIZE = 180

const svg = readFileSync(SOURCE, 'utf8')

function render(size: number): Buffer {
  return Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng())
}

console.log(`\n🎨 สร้าง favicon จาก ${SOURCE}\n`)

for (const size of SIZES) {
  const file = `public/favicon-${size}.png`
  writeFileSync(file, render(size))
  console.log(`  ✅ ${file.padEnd(28)} ${size}×${size} px`)
}

writeFileSync('public/apple-touch-icon.png', render(APPLE_TOUCH_SIZE))
console.log(`  ✅ ${'public/apple-touch-icon.png'.padEnd(28)} ${APPLE_TOUCH_SIZE}×${APPLE_TOUCH_SIZE} px`)

console.log('\n   แท็กใน src/layouts/Layout.astro ชี้ไฟล์เหล่านี้อยู่แล้ว ไม่ต้องแก้เพิ่ม\n')
