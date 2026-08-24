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

/* ==========================================================================
 * รหัสกู้ยศ — ย้ายเครื่อง / กู้คืนหลังล้างข้อมูลเบราว์เซอร์
 * ------------------------------------------------------------------------
 * ตัวตนของผู้ใช้ผูกกับ device id ใน localStorage อย่างเดียว
 * ล้างข้อมูลเว็บไซต์เมื่อไหร่ ยศที่สะสมมาทั้งหมดจะเข้าถึงไม่ได้อีก
 * ซึ่งทำให้คนไม่กล้าลงแรงสะสมระยะยาว
 *
 * รหัสกู้ยศคือ device id ตัวเดียวกันนั่นเอง แค่จัดรูปแบบให้อ่านและพิมพ์ง่ายขึ้น
 * ใครถือรหัสก็เข้าถึงโปรไฟล์นั้นได้ จึงต้องเตือนผู้ใช้ให้เก็บเป็นความลับ
 * ======================================================================== */

/**
 * device id ที่เราสร้าง มี 2 รูปแบบ
 *   crypto.randomUUID()  →  a3f8c1d2-4b5e-6789-abcd-ef0123456789
 *   fallback             →  dev-1735012345678-k3f9x2ab
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const FALLBACK_RE = /^dev-\d+-[a-z0-9]+$/

/**
 * จัดรูปแบบรหัสกู้ยศ
 *
 * ห้ามตัดตัวอักษรทิ้งเด็ดขาด เพราะรหัสต้องแปลงกลับเป็น device id เดิมได้เป๊ะ
 * ไม่งั้นตอนค้นใน DB จะหาไม่เจอ แล้วฟีเจอร์กู้ยศจะพังทั้งระบบ
 * จึงแค่เติม prefix กับทำเป็นตัวพิมพ์ใหญ่เพื่อให้อ่านและบอกต่อทางโทรศัพท์ง่ายขึ้น
 */
export function formatRecoveryCode(deviceId: string): string {
  return `NMD-${deviceId.toUpperCase()}`
}

/** รหัสกู้ยศของเครื่องนี้ — null ถ้ายังไม่เคยลงทะเบียน */
export function getRecoveryCode(): string | null {
  const id = peekDeviceId()
  return id ? formatRecoveryCode(id) : null
}

/**
 * แปลงรหัสที่ผู้ใช้กรอกกลับเป็น device id
 *
 * รับได้ทั้งมีและไม่มี prefix, ตัวพิมพ์เล็กหรือใหญ่, มีช่องว่างหน้าหลัง
 * แต่ต้องตรงรูปแบบ id ที่ระบบสร้างจริงเท่านั้น — ถ้าไม่ตรงคืน null
 * เพื่อไม่ให้เขียนค่าขยะทับตัวตนเดิมของผู้ใช้
 */
export function parseRecoveryCode(input: string): string | null {
  const clean = input
    .trim()
    .replace(/^NMD[-\s]*/i, '')
    .replace(/\s+/g, '')
    .toLowerCase()

  if (UUID_RE.test(clean) || FALLBACK_RE.test(clean)) return clean
  return null
}

/** ใช้รหัสกู้ยศ — เขียนทับตัวตนของเครื่องนี้ */
export function applyRecoveryCode(input: string): boolean {
  const id = parseRecoveryCode(input)
  if (!id) return false

  try {
    localStorage.setItem(DEVICE_KEY, id)
    localStorage.removeItem(PROFILE_KEY)
    return true
  } catch {
    return false
  }
}
