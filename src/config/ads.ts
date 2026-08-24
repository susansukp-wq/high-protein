/**
 * ads.ts — รหัสช่องโฆษณา AdSense ทั้งหมดของเว็บ รวมไว้ที่เดียว
 *
 * วิธีได้รหัสมา:
 *   AdSense > Ads > By ad unit > Display ads > สร้าง ad unit ใหม่
 *   แล้วคัดลอกเลขในบรรทัด data-ad-slot="1234567890" มาใส่ตรงนี้
 *
 * รหัสช่องโฆษณาไม่ใช่ความลับ (มันถูกฝังใน HTML ที่ส่งไปเบราว์เซอร์อยู่แล้ว)
 * จึงเก็บในโค้ดได้ ไม่ต้องใส่ .env ให้ยุ่งยาก
 *
 * ช่องที่ยังเป็นค่าว่าง = ระบบจะโชว์แค่พื้นที่จองไว้ ไม่ยิงสคริปต์โฆษณา
 */

export const AD_SLOTS = {
  /** สี่เหลี่ยมใต้คำด่าในหน้าผลลัพธ์ — จุดที่สายตาเพ่งอยู่นานที่สุด */
  verdictRectangle: '',
  /** แบนเนอร์แนวนอนคั่นกลางเนื้อหาในหน้า /burn/[slug] */
  burnInline: '',
  /** แบนเนอร์ท้ายหน้า /burn/[slug] */
  burnFooter: '',
  /** แบนเนอร์ท้ายหน้า /food/[slug] */
  foodFooter: '',
} as const

export type AdSlotKey = keyof typeof AD_SLOTS

/**
 * หน้าที่ไม่ควรมีโฆษณา
 *
 * นโยบาย Google Publisher ห้ามวางโฆษณาบนเนื้อหาที่เข้าข่ายทางเพศ
 * หน้านี้พูดถึงการเผาผลาญจากกิจกรรมทางเพศโดยอ้างงานวิจัย ซึ่งเป็นเนื้อหาเชิงสุขภาพ
 * แต่ความเสี่ยงที่ระบบตรวจอัตโนมัติจะตีความผิดมีจริง จึงกันออกไว้ก่อน
 * ปลอดภัยกว่าการเสี่ยงให้ทั้งบัญชีโดนระงับเพราะหน้าเดียว
 */
export const AD_BLOCKED_SLUGS: readonly string[] = ['sexual_activity']

export function isAdAllowed(slug?: string): boolean {
  return !slug || !AD_BLOCKED_SLUGS.includes(slug)
}
