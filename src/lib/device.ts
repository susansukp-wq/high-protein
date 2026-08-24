/**
 * device.ts — ตัวตนของเครื่องนี้ (ไม่มี dependency หนักเลย)
 *
 * ทำไมต้องแยกออกมาจาก profile.ts:
 *   profile.ts import supabase-js ซึ่งหนัก 57 KB (gzip)
 *   ถ้า CalculatorFlow อยากรู้แค่ว่า "เครื่องนี้เคยลงทะเบียนไหม"
 *   แต่ต้อง import profile.ts มาด้วย = ลาก supabase-js เข้าหน้าแรกทั้งก้อน
 *
 *   ไฟล์นี้แตะแค่ localStorage จึงเบามาก และทำให้ผู้ใช้ที่เข้าเว็บครั้งแรก
 *   ไม่ต้องโหลด supabase-js เลย (เพราะไม่มีโปรไฟล์ให้ไปดึงอยู่แล้ว)
 */

const DEVICE_KEY = 'nmd:device-id'
const PROFILE_KEY = 'nmd:profile-id'

/** อ่านเฉยๆ ไม่สร้างใหม่ — ใช้เช็คว่าเครื่องนี้เคยลงทะเบียนหรือยัง */
export function peekDeviceId(): string | null {
  try {
    return localStorage.getItem(DEVICE_KEY)
  } catch {
    return null
  }
}

/** อ่าน หรือสร้างใหม่ถ้ายังไม่มี — คืน null ถ้า localStorage ใช้ไม่ได้ */
export function getDeviceId(): string | null {
  try {
    const existing = localStorage.getItem(DEVICE_KEY)
    if (existing) return existing

    const generated =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    localStorage.setItem(DEVICE_KEY, generated)
    return generated
  } catch {
    return null
  }
}

export function rememberProfileId(id: string): void {
  try {
    localStorage.setItem(PROFILE_KEY, id)
  } catch {
    /* ignore */
  }
}

export function getCachedProfileId(): string | null {
  try {
    return localStorage.getItem(PROFILE_KEY)
  } catch {
    return null
  }
}

/** ลืมตัวตนในเครื่องนี้ — ไม่ได้ลบข้อมูลบนบอร์ด */
export function forgetProfile(): void {
  try {
    localStorage.removeItem(DEVICE_KEY)
    localStorage.removeItem(PROFILE_KEY)
  } catch {
    /* ignore */
  }
}
