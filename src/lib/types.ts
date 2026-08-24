/**
 * Single source of truth ของ Data Model
 * ใช้ร่วมกันทั้งฝั่งแอป (src/**) และสคริปต์ seed (scripts/seed.ts)
 */

/** กลุ่มหมวดหมู่ของกิจกรรม (ใช้จัดกลุ่มบนหน้า UI) */
export type ActivityGroup =
  | 'fighter'    // 🥊 สายปะทะ ลูกผู้ชาย
  | 'cardio'     // 🏃 สายคาร์ดิโอ หอบจนพูดไม่ออก
  | 'soft'       // 🧘 ลูกคุณหนู สายซอฟต์
  | 'no_excuse'  // 🤡 คนขี้เกียจ สายฮา
  | 'daily'      // 🏠 กิจวัตรประจำวัน

/** ระดับความแรงของคำจิกกัด 1 = ทีเล่นทีจริง, 5 = ด่าแบบไม่เหลือหน้า */
export type RoastIntensity = 1 | 2 | 3 | 4 | 5

/** ชื่อกลุ่มภาษาไทย สำหรับแสดงผล / จัดกลุ่มใน dropdown */
export const ACTIVITY_GROUP_LABEL: Record<ActivityGroup, string> = {
  fighter: '🥊 สายปะทะ ลูกผู้ชาย',
  cardio: '🏃 สายคาร์ดิโอ หอบจนพูดไม่ออก',
  soft: '🧘 ลูกคุณหนู สายซอฟต์',
  daily: '🏠 กิจวัตรประจำวัน',
  no_excuse: '🤡 สายขี้เกียจ ไม่มีข้อแก้ตัว',
}

/** ลำดับการแสดงกลุ่มบน UI */
export const ACTIVITY_GROUP_ORDER: ActivityGroup[] = [
  'fighter',
  'cardio',
  'soft',
  'daily',
  'no_excuse',
]

/* -------------------------------------------------------------------------- */
/*  ACTIVITIES                                                                */
/* -------------------------------------------------------------------------- */

/** รูปแบบข้อมูลตอน insert (ยังไม่มี id / timestamps) */
export interface ActivityInsert {
  /** key หลัก ใช้เชื่อมกับ Roast.category */
  slug: string
  name_th: string
  name_en: string
  /** Metabolic Equivalent of Task */
  mets: number
  group_key: ActivityGroup
  emoji: string
  /** ---- SEO fields สำหรับ dynamic route /burn/[slug] ---- */
  seo_title: string
  seo_description: string
  keywords: string[]
  sort_order: number
  is_active: boolean
}

/** รูปแบบข้อมูลที่อ่านกลับมาจากตาราง activities */
export interface Activity extends ActivityInsert {
  id: string
  created_at: string
  updated_at: string
}

/* -------------------------------------------------------------------------- */
/*  ROASTS                                                                    */
/* -------------------------------------------------------------------------- */

export interface RoastInsert {
  /** unique key เช่น football_01 → ทำให้ upsert ซ้ำได้โดยไม่เกิด duplicate */
  slug: string
  /** ตรงกับ Activity.slug หรือ 'wall_of_shame' */
  category: string
  message: string
  intensity: RoastIntensity
  is_active: boolean
}

export interface Roast extends RoastInsert {
  id: string
  created_at: string
}

/* -------------------------------------------------------------------------- */
/*  PROFILES + BURN LOGS (ระบบยศ / จัดอันดับ)                                  */
/* -------------------------------------------------------------------------- */

export interface Profile {
  id: string
  /** ตัวตนแบบไม่ล็อกอิน — generate ในเบราว์เซอร์ เก็บใน localStorage */
  device_id: string
  nickname: string
  /** ---- ข้อมูลร่างกาย (nullable เพราะโปรไฟล์เก่ายังไม่มี) ---- */
  gender: import('./health').Gender | null
  height_cm: number | null
  weight_kg: number | null
  age: number | null
  /** นาทีที่ชดใช้แล้วจริง → ใช้คิดยศบวก */
  total_paid_minutes: number
  /** นาทีที่ยังค้าง → ใช้คิดยศประจาน */
  debt_minutes: number
  current_streak: number
  best_streak: number
  last_paid_on: string | null
  created_at: string
  updated_at: string
}

/** แถวบนบอร์ด — ไม่ต้องดึง device_id ออกมาโชว์ */
export type LeaderboardRow = Pick<
  Profile,
  'id' | 'nickname' | 'total_paid_minutes' | 'debt_minutes' | 'current_streak' | 'best_streak'
>

export type BurnLogStatus = 'pending' | 'paid'

export interface BurnLog {
  id: string
  profile_id: string
  food_name: string
  kcal: number
  activity_slug: string
  minutes: number
  status: BurnLogStatus
  logged_at: string
  paid_at: string | null
}

/* -------------------------------------------------------------------------- */
/*  APP-LEVEL TYPES                                                           */
/* -------------------------------------------------------------------------- */

/** ผลลัพธ์การตัดสิน (Step 3) */
export interface Judgment {
  foodName: string
  kcal: number
  weight: number
  activity: Activity
  /** เวลาที่ต้องออกกำลังกาย (นาที) */
  minutes: number
  roast: string
}
