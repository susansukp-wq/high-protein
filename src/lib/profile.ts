/**
 * profile.ts — Data layer ของระบบยศ / จัดอันดับ
 *
 * ตัวตนแบบไม่ล็อกอิน: generate device_id ในเบราว์เซอร์ เก็บใน localStorage
 * แล้วผูกกับแถวใน public.profiles
 *
 * หมายเหตุ: ทุกฟังก์ชันในไฟล์นี้เรียกได้เฉพาะฝั่ง client (ใช้ localStorage)
 * ยกเว้น getLeaderboard / getWallOfShame ที่ดึงตอน build ได้
 */

import { supabase, supabaseConfigError, type Result } from './supabase'
import type { BurnLog, LeaderboardRow, Profile } from './types'
import type { BodyProfile, Gender } from './health'
import { SHAME_THRESHOLD_MINUTES } from './ranks'

const DEVICE_KEY = 'nmd:device-id'
const PROFILE_KEY = 'nmd:profile-id'

const LEADERBOARD_COLUMNS =
  'id, nickname, total_paid_minutes, debt_minutes, current_streak, best_streak'

/* ==========================================================================
 * DEVICE IDENTITY
 * ======================================================================== */

/** อ่าน/สร้าง device id — คืน null ถ้า localStorage ใช้ไม่ได้ (โหมดส่วนตัว) */
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

function rememberProfileId(id: string): void {
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

/** ลืมตัวตนในเครื่องนี้ (ปุ่ม "เริ่มใหม่") — ไม่ได้ลบข้อมูลบนบอร์ด */
export function forgetProfile(): void {
  try {
    localStorage.removeItem(DEVICE_KEY)
    localStorage.removeItem(PROFILE_KEY)
  } catch {
    /* ignore */
  }
}

/* ==========================================================================
 * PROFILE
 * ======================================================================== */

/** ดึงโปรไฟล์ของเครื่องนี้ — null = ยังไม่เคยตั้งชื่อ */
export async function getMyProfile(): Promise<Profile | null> {
  if (supabaseConfigError) return null

  const deviceId = getDeviceId()
  if (!deviceId) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('device_id', deviceId)
    .maybeSingle()

  if (error) {
    console.error('[getMyProfile]', error.message)
    return null
  }

  if (data) rememberProfileId((data as Profile).id)
  return (data as Profile) ?? null
}

export interface ProfileInput extends Partial<BodyProfile> {
  nickname: string
}

/** ตรวจข้อมูลก่อนส่งขึ้น DB — คืนข้อความไทยที่บอกได้ว่าผิดตรงไหน */
function validateProfileInput(input: ProfileInput): string | null {
  const name = input.nickname.trim()
  if (name.length < 2 || name.length > 20) return 'ชื่อต้องยาว 2–20 ตัวอักษร'

  if (input.heightCm !== undefined && (input.heightCm < 100 || input.heightCm > 250))
    return 'ส่วนสูงต้องอยู่ระหว่าง 100–250 ซม.'
  if (input.weightKg !== undefined && (input.weightKg < 20 || input.weightKg > 400))
    return 'น้ำหนักต้องอยู่ระหว่าง 20–400 กก.'
  if (input.age !== undefined && (input.age < 10 || input.age > 120))
    return 'อายุต้องอยู่ระหว่าง 10–120 ปี'

  return null
}

/** สร้างโปรไฟล์ใหม่พร้อมข้อมูลร่างกาย */
export async function createProfile(input: ProfileInput): Promise<Result<Profile | null>> {
  if (supabaseConfigError) return { data: null, error: supabaseConfigError }

  const invalid = validateProfileInput(input)
  if (invalid) return { data: null, error: invalid }

  const deviceId = getDeviceId()
  if (!deviceId) {
    return {
      data: null,
      error: 'เบราว์เซอร์นี้ปิดการเก็บข้อมูลในเครื่อง เลยจำตัวตนไม่ได้ (ลองปิดโหมดส่วนตัว)',
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      device_id: deviceId,
      nickname: input.nickname.trim(),
      gender: input.gender ?? null,
      height_cm: input.heightCm ?? null,
      weight_kg: input.weightKg ?? null,
      age: input.age ?? null,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[createProfile]', error.message)
    return { data: null, error: `สมัครขึ้นบอร์ดไม่สำเร็จ: ${error.message}` }
  }

  const profile = data as Profile
  rememberProfileId(profile.id)
  return { data: profile, error: null }
}

/**
 * แก้ข้อมูลร่างกาย — ผ่าน RPC เท่านั้น
 * ตาราง profiles ไม่มี UPDATE policy โดยตั้งใจ เพื่อไม่ให้ใครแก้แต้มอันดับตัวเองได้
 * ฟังก์ชันนี้เป็น security definer ที่แตะได้เฉพาะ 5 ฟิลด์ที่ปลอดภัย
 */
export async function updateBodyProfile(input: ProfileInput): Promise<Result<Profile | null>> {
  if (supabaseConfigError) return { data: null, error: supabaseConfigError }

  const invalid = validateProfileInput(input)
  if (invalid) return { data: null, error: invalid }

  const deviceId = getDeviceId()
  if (!deviceId) return { data: null, error: 'ไม่พบตัวตนของเครื่องนี้' }

  const { data, error } = await supabase.rpc('update_body_profile', {
    p_device_id: deviceId,
    p_nickname: input.nickname.trim(),
    p_gender: (input.gender ?? null) as Gender | null,
    p_height_cm: input.heightCm ?? null,
    p_weight_kg: input.weightKg ?? null,
    p_age: input.age ?? null,
  })

  if (error) {
    console.error('[updateBodyProfile]', error.message)
    return { data: null, error: `บันทึกข้อมูลไม่สำเร็จ: ${error.message}` }
  }

  return { data: data as Profile, error: null }
}

/** แปลง Profile จาก DB เป็นรูปแบบที่ health.ts ใช้คำนวณได้ — null ถ้าข้อมูลไม่ครบ */
export function toBodyProfile(profile: Profile | null): BodyProfile | null {
  if (!profile || !profile.gender || !profile.height_cm || !profile.weight_kg || !profile.age) {
    return null
  }
  return {
    gender: profile.gender,
    heightCm: Number(profile.height_cm),
    weightKg: Number(profile.weight_kg),
    age: profile.age,
  }
}

/* ==========================================================================
 * BURN LOGS
 * ======================================================================== */

export interface NewBurnLog {
  profileId: string
  foodName: string
  kcal: number
  activitySlug: string
  minutes: number
}

/** บันทึกหนี้ 1 รายการ (สถานะ pending) — trigger จะบวก debt_minutes ให้เอง */
export async function logBurn(input: NewBurnLog): Promise<Result<BurnLog | null>> {
  if (supabaseConfigError) return { data: null, error: supabaseConfigError }

  const { data, error } = await supabase
    .from('burn_logs')
    .insert({
      profile_id: input.profileId,
      food_name: input.foodName.slice(0, 80),
      kcal: Math.round(input.kcal),
      activity_slug: input.activitySlug,
      minutes: Math.round(input.minutes),
      status: 'pending',
    })
    .select('*')
    .single()

  if (error) {
    console.error('[logBurn]', error.message)
    return { data: null, error: `บันทึกหนี้ไม่สำเร็จ: ${error.message}` }
  }

  return { data: data as BurnLog, error: null }
}

/**
 * กดว่า "ชดใช้แล้ว"
 *
 * เงื่อนไข .eq('status', 'pending') ทำให้กดซ้ำไม่ได้แต้มซ้ำ
 * (RLS policy ก็บังคับซ้ำอีกชั้นในฝั่ง DB)
 */
export async function settleBurnLog(logId: string): Promise<Result<boolean>> {
  if (supabaseConfigError) return { data: false, error: supabaseConfigError }

  const { data, error } = await supabase
    .from('burn_logs')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', logId)
    .eq('status', 'pending')
    .select('id')

  if (error) {
    console.error('[settleBurnLog]', error.message)
    return { data: false, error: `บันทึกการชดใช้ไม่สำเร็จ: ${error.message}` }
  }

  if (!data || data.length === 0) {
    return { data: false, error: 'รายการนี้ถูกชดใช้ไปแล้ว' }
  }

  return { data: true, error: null }
}

/** รายการหนี้ของโปรไฟล์ (ล่าสุดก่อน) */
export async function getMyLogs(profileId: string, limit = 20): Promise<BurnLog[]> {
  if (supabaseConfigError) return []

  const { data, error } = await supabase
    .from('burn_logs')
    .select('*')
    .eq('profile_id', profileId)
    .order('logged_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getMyLogs]', error.message)
    return []
  }

  return (data ?? []) as BurnLog[]
}

/* ==========================================================================
 * LEADERBOARDS
 * ======================================================================== */

/** หอเกียรติยศ — เรียงตามนาทีที่ชดใช้จริง */
export async function getHallOfFame(limit = 20): Promise<Result<LeaderboardRow[]>> {
  if (supabaseConfigError) return { data: [], error: supabaseConfigError }

  const { data, error } = await supabase
    .from('profiles')
    .select(LEADERBOARD_COLUMNS)
    .gt('total_paid_minutes', 0)
    .order('total_paid_minutes', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getHallOfFame]', error.message)
    return { data: [], error: `โหลดอันดับไม่สำเร็จ: ${error.message}` }
  }

  return { data: (data ?? []) as LeaderboardRow[], error: null }
}

/** บอร์ดประจาน — เรียงตามหนี้ที่ค้างมากสุด */
export async function getWallOfShame(limit = 20): Promise<Result<LeaderboardRow[]>> {
  if (supabaseConfigError) return { data: [], error: supabaseConfigError }

  const { data, error } = await supabase
    .from('profiles')
    .select(LEADERBOARD_COLUMNS)
    .gte('debt_minutes', SHAME_THRESHOLD_MINUTES)
    .order('debt_minutes', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getWallOfShame]', error.message)
    return { data: [], error: `โหลดบอร์ดประจานไม่สำเร็จ: ${error.message}` }
  }

  return { data: (data ?? []) as LeaderboardRow[], error: null }
}
