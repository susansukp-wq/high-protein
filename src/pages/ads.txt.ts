/**
 * ads.txt — ไฟล์มาตรฐาน IAB ที่ AdSense บังคับให้มี
 *
 * ถ้าไม่มี Dashboard จะขึ้นเตือน "Earnings at risk" และรายได้บางส่วนจะถูกกัน
 * สร้างจาก env ตอน build เพื่อไม่ต้อง hard-code publisher id ลง repo
 *
 * ผลลัพธ์ถูกเขียนเป็นไฟล์นิ่งที่ dist/ads.txt — ไม่ใช้ server
 */
import type { APIRoute } from 'astro'

export const GET: APIRoute = () => {
  const clientId = import.meta.env.PUBLIC_ADSENSE_CLIENT_ID ?? ''

  if (!clientId.startsWith('ca-pub-')) {
    return new Response('# ยังไม่ได้ตั้งค่า PUBLIC_ADSENSE_CLIENT_ID\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  // ตัด "ca-" ออก เพราะ ads.txt ใช้รูปแบบ pub-xxxxx
  const publisherId = clientId.replace(/^ca-/, '')

  return new Response(
    `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  )
}
