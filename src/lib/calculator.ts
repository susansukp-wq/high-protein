/**
 * calculator.ts — ตรรกะการคำนวณล้วนๆ (Pure functions, ไม่แตะ DB / ไม่แตะ DOM)
 * ทดสอบง่าย และเรียกได้ทั้งฝั่ง Server (build time) และ Client
 *
 * สูตรมาตรฐาน METs:
 *   kcal ที่เผาผลาญ = METs × 3.5 × น้ำหนัก(kg) / 200 × นาที
 * กลับด้านเพื่อหา "ต้องออกกี่นาที":
 *   นาที = (kcal × 200) / (METs × 3.5 × น้ำหนัก)
 */

/** ค่า default สำหรับหน้า SEO ที่ยังไม่รู้จักผู้ใช้ (คนไทยเฉลี่ยโดยประมาณ) */
export const DEFAULT_WEIGHT_KG = 70

/**
 * คำนวณเวลาที่ต้องออกกำลังกายเพื่อเผาผลาญแคลอรี่ที่กินเข้าไป
 * @param kcal   แคลอรี่ของอาหารที่กิน
 * @param weight น้ำหนักตัว (กิโลกรัม)
 * @param mets   ค่า METs ของกิจกรรม
 * @returns      จำนวนนาที (ปัดเป็นจำนวนเต็ม) — คืน 0 ถ้า input ไม่ถูกต้อง
 */
export function calculateBurnTime(kcal: number, weight: number, mets: number): number {
  if (!Number.isFinite(kcal) || !Number.isFinite(weight) || !Number.isFinite(mets)) return 0
  if (kcal <= 0 || weight <= 0 || mets <= 0) return 0

  return Math.round((kcal * 200) / (mets * 3.5 * weight))
}

/**
 * ด้านกลับ: ออกกำลังกาย X นาที เผาผลาญได้กี่แคลอรี่
 * (ใช้โชว์ในหน้า SEO ว่า "วิ่ง 30 นาที = กี่แคล")
 */
export function calculateBurnedCalories(minutes: number, weight: number, mets: number): number {
  if (minutes <= 0 || weight <= 0 || mets <= 0) return 0
  return Math.round((mets * 3.5 * weight * minutes) / 200)
}

/**
 * แปลงนาทีเป็นข้อความภาษาไทยที่อ่านแล้วเจ็บ
 * 45   → "45 นาที"
 * 150  → "2 ชั่วโมง 30 นาที"
 * 1500 → "1 วัน 1 ชั่วโมง"
 */
export function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 นาที'

  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  const parts: string[] = []
  if (days > 0) parts.push(`${days} วัน`)
  if (hours > 0) parts.push(`${hours} ชั่วโมง`)
  // ถ้าเกิน 1 วันแล้ว ไม่ต้องโชว์เศษนาทีให้รก
  if (minutes > 0 && days === 0) parts.push(`${minutes} นาที`)

  return parts.join(' ') || '0 นาที'
}

/** เวอร์ชันสั้นสำหรับใส่ในตาราง — "2 ชม. 30 น." */
export function formatDurationShort(totalMinutes: number): string {
  if (totalMinutes <= 0) return '-'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} นาที`
  if (minutes === 0) return `${hours} ชม.`
  return `${hours} ชม. ${minutes} น.`
}

/** ระดับความซวย ใช้เลือกสี/ข้อความบน UI ผลลัพธ์ */
export type SeverityLevel = 'light' | 'medium' | 'heavy' | 'insane'

export function getSeverityLevel(minutes: number): SeverityLevel {
  if (minutes < 30) return 'light'
  if (minutes < 90) return 'medium'
  if (minutes < 240) return 'heavy'
  return 'insane'
}

export const SEVERITY_LABEL: Record<SeverityLevel, string> = {
  light: 'ยังพอไหว อย่าเหลิง',
  medium: 'เริ่มหนักแล้วนะ',
  heavy: 'สาหัส',
  insane: 'เกินเยียวยา',
}
