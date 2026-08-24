/**
 * site.ts — ข้อมูลตัวตนของเว็บไซต์ รวมไว้ที่เดียว
 *
 * ⚠️ ต้องแก้ CONTACT_EMAIL ก่อน deploy จริง
 *    Google ตรวจหน้า Contact ตอนพิจารณา AdSense ถ้าเป็นค่าตัวอย่างจะไม่ผ่าน
 *
 * แนะนำให้ใช้อีเมลแยกสำหรับเว็บ ไม่ใช้อีเมลส่วนตัว
 * เพราะอีเมลบนหน้าเว็บสาธารณะจะโดนบอทเก็บไปส่งสแปมแน่นอน
 */

export const SITE = {
  name: 'ลดน้ำหนักไม่มีคำว่าปลอบใจ',
  tagline: 'กินไปเท่าไหร่ ก็ต้องชดใช้เท่านั้น',

  /** ⚠️ แก้ตรงนี้ */
  contactEmail: 'calcomburn@gmail.com',

  /** ชื่อผู้ดูแล — จะแสดงบนหน้า Contact และ About */
  owner: 'ทีมงานลดน้ำหนักไม่มีคำว่าปลอบใจ',

  /** ปีที่เริ่มทำเว็บ ใช้แสดงใน footer */
  since: 2026,
} as const

/** ยังไม่ได้แก้อีเมล = ยังสมัคร AdSense ไม่ได้ */
export const isContactConfigured = !SITE.contactEmail.includes('example.com')
