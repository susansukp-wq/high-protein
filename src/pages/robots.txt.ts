/**
 * robots.txt — สร้างจาก Astro.site ตอน build
 *
 * เดิมเป็นไฟล์นิ่งใน public/ ที่ hard-code โดเมนไว้
 * ซึ่งจะชี้ผิดทันทีถ้าเปลี่ยนโดเมนหรือ deploy ขึ้น preview URL
 * ผูกกับ site ใน astro.config.mjs แทน จะได้แก้ที่เดียว
 */
import type { APIRoute } from 'astro'

export const GET: APIRoute = ({ site }) => {
  const origin = site?.origin ?? 'http://localhost:4321'

  const body = `User-agent: *
Allow: /

# รูป Open Graph — เป็นไฟล์รูป ไม่ใช่หน้าเว็บ ไม่ต้องเก็บเข้า index
Disallow: /og/

Sitemap: ${origin}/sitemap-index.xml
`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
