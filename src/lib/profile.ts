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
import { applyRecoveryCode, getDeviceId, parseRecoveryCode, rememberProfileId } from './device'

// re-export ให้โค้ดเดิมที่ import จากไฟล์นี้ยังใช้ได้
export {
  applyRecoveryCode,
  forgetProfile,
  formatRecoveryCode,
  getCachedProfileId,
  getDeviceId,
  getRecoveryCode,
  parseRecoveryCode,
  peekDeviceId,
} from './device'

/** คอลัมน์ที่ใช้แสดงบนบอร์ด — ไม่ดึง device_id กับข้อมูลร่างกายออกมาโดยไม่จำเป็น */
const LEADERBOARD_COLUMNS =
  'id, nickname, total_paid_minutes, debt_minutes, current_streak, best_streak'

/* ==========================================================================
 * SESSION
 * ------------------------------------------------------------------------
 * ใช้ anonymous sign-in ของ Supabase — ผู้ใช้ไม่ต้องกรอกอะไรเพิ่มเลย
 * แต่ได้ auth.uid() ที่ RLS ใช้ตรวจสิทธิ์ได้จริง
 * ======================================================================== */

/** ให้แน่ใจว่ามี session ก่อนเขียนข้อมูล — คืน user id หรือ null ถ้าล้มเหลว */
export async function ensureSession(): Promise<string | null> {
  if (supabaseConfigError) return null

  const { data: existing } = await supabase.auth.getSession()
  if (existing.session?.user?.id) return existing.session.user.id

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.error('[ensureSession]', error.message)
    return null
  }
  return data.user?.id ?? null
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

  let profile = data as Profile | null
  if (!profile) return null

  /*
   * โปรไฟล์นี้อาจยังไม่ผูกกับผู้ใช้คนนี้ ใน 2 กรณี
   *   1. สร้างไว้ก่อนที่ระบบจะมี auth
   *   2. session เดิมหมดอายุ แล้วได้ผู้ใช้ anonymous คนใหม่
   * ทั้งสองกรณีเจ้าของตัวจริงถือ device_id อยู่ จึงมีสิทธิ์อ้างคืนได้
   */
  const userId = await ensureSession()
  if (userId && profile.user_id !== userId) {
    const { data: claimed, error: claimError } = await supabase.rpc('claim_profile', {
      p_device_id: deviceId,
    })
    if (claimError) console.error('[getMyProfile] claim', claimError.message)
    else if (claimed) profile = claimed as Profile
  }

  rememberProfileId(profile.id)
  return profile
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

/**
 * ตรวจว่ารหัสกู้ยศใช้ได้จริงก่อนเขียนทับตัวตนเดิม
 *
 * สำคัญ: ถ้าเขียนทับก่อนตรวจ แล้วรหัสผิด ผู้ใช้จะเสียตัวตนเดิมไปฟรีๆ
 * จึงต้องยิงถาม DB ให้แน่ใจว่ามีโปรไฟล์นั้นอยู่จริงก่อนเสมอ
 */
export async function findProfileByRecoveryCode(code: string): Promise<Result<Profile | null>> {
  if (supabaseConfigError) return { data: null, error: supabaseConfigError }

  const deviceId = parseRecoveryCode(code)
  if (!deviceId) {
    return { data: null, error: 'รูปแบบรหัสไม่ถูกต้อง — ต้องขึ้นต้นด้วย NMD- และยาวพอ' }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('device_id', deviceId)
    .maybeSingle()

  if (error) {
    console.error('[findProfileByRecoveryCode]', error.message)
    return { data: null, error: `ตรวจสอบรหัสไม่สำเร็จ: ${error.message}` }
  }

  if (!data) {
    return { data: null, error: 'ไม่พบโปรไฟล์ที่ตรงกับรหัสนี้ ลองตรวจว่าพิมพ์ครบไหม' }
  }

  return { data: data as Profile, error: null }
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

  const userId = await ensureSession()
  if (!userId) {
    return { data: null, error: 'สร้าง session ไม่สำเร็จ — ลองรีเฟรชหน้าเว็บอีกครั้ง' }
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      device_id: deviceId,
      user_id: userId,
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

  const userId = await ensureSession()
  if (!userId) return { data: null, error: 'สร้าง session ไม่สำเร็จ — ลองรีเฟรชหน้าเว็บ' }

  const { data, error } = await supabase.rpc('update_my_profile', {
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

/**
 * กู้ยศด้วยรหัส — ตรวจกับ DB ก่อน ถ้าเจอค่อยเขียนทับตัวตนในเครื่อง
 */
export async function restoreProfile(code: string): Promise<Result<Profile | null>> {
  const { data, error } = await findProfileByRecoveryCode(code)
  if (error || !data) return { data: null, error: error ?? 'ไม่พบโปรไฟล์' }

  if (!applyRecoveryCode(code)) {
    return { data: null, error: 'เบราว์เซอร์นี้บันทึกข้อมูลไม่ได้ (ลองปิดโหมดส่วนตัว)' }
  }

  // เปลี่ยนเจ้าของให้เป็นผู้ใช้ของเครื่องนี้ ไม่งั้นจะอ่านได้แต่บันทึกอะไรไม่ได้
  const userId = await ensureSession()
  if (userId) {
    const deviceId = parseRecoveryCode(code)
    const { data: claimed, error: claimError } = await supabase.rpc('claim_profile', {
      p_device_id: deviceId,
    })
    if (claimError) {
      console.error('[restoreProfile] claim', claimError.message)
      return { data: null, error: `กู้ยศไม่สำเร็จ: ${claimError.message}` }
    }
    rememberProfileId((claimed as Profile).id)
    return { data: claimed as Profile, error: null }
  }

  rememberProfileId(data.id)
  return { data, error: null }
}
