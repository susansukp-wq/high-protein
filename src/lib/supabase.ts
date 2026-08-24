/**
 * supabase.ts — ตัวเชื่อมต่อฐานข้อมูล + Data Access Layer
 *
 * ใช้ anon key เท่านั้น (ปลอดภัยสำหรับฝั่ง client)
 * ตาราง activities / roasts เปิด RLS policy ให้ select ได้เฉพาะแถวที่ is_active = true
 * → ดูไฟล์ supabase/schema.sql
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Activity, Roast } from './types'

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? ''

/* ==========================================================================
 * CONFIG CHECK
 * ------------------------------------------------------------------------
 * เจตนาไม่ throw: ถ้าโยน error ตอน import module ตัว React island จะพังทั้งก้อน
 * ผู้ใช้จะเห็นหน้าขาวโดยไม่รู้สาเหตุ — เก็บไว้เป็นข้อความแล้วให้ UI แสดงแทน
 * ======================================================================== */

/** ค่าที่ยังไม่ได้แก้จาก .env.example — เจอแล้วต้องเตือน ไม่ใช่ปล่อยเงียบ */
function looksLikePlaceholder(value: string): boolean {
  return (
    value.includes('xxxx') ||
    value.includes('your-project') ||
    value.endsWith('...') ||
    value === 'dummy'
  )
}

function detectConfigError(): string | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return 'ยังไม่ได้ตั้งค่า PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY ในไฟล์ .env'
  }
  if (looksLikePlaceholder(SUPABASE_URL) || looksLikePlaceholder(SUPABASE_ANON_KEY)) {
    return 'ไฟล์ .env ยังเป็นค่าตัวอย่างจาก .env.example — ใส่ค่าจริงจาก Supabase Dashboard > Project Settings > API'
  }
  return null
}

/** null = ตั้งค่าถูกต้อง, string = ข้อความอธิบายว่าตั้งค่าผิดตรงไหน */
export const supabaseConfigError: string | null = detectConfigError()

if (supabaseConfigError) {
  console.error(`[supabase] ${supabaseConfigError}`)
}

/**
 * Node < 22 ไม่มี global WebSocket แต่ createClient() สร้าง RealtimeClient เสมอ
 * → build จะพังตอน pre-render ถ้าไม่ polyfill ให้ก่อน
 *
 * บล็อกนี้ถูกตัดทิ้งทั้งก้อนตอน build ฝั่ง client (import.meta.env.SSR = false)
 * ดังนั้น 'ws' จะไม่ถูกรวมเข้า bundle ที่ส่งไป browser
 */
if (import.meta.env.SSR && typeof globalThis.WebSocket === 'undefined') {
  const { WebSocket } = await import('ws')
  globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket
}

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY || 'not-configured',
  {
    auth: { persistSession: false },
    // ไม่ได้ใช้ realtime subscription — ลด heartbeat ไม่ให้กิน resource ตอน build
    realtime: { params: { eventsPerSecond: 1 } },
  },
)

/* ==========================================================================
 * RESULT TYPE
 * ------------------------------------------------------------------------
 * คืน error กลับไปด้วยเสมอ แทนที่จะกลืนลง console เงียบๆ
 * UI จะได้บอกผู้ใช้ได้ว่า "โหลดไม่ได้เพราะอะไร" ไม่ใช่โชว์ dropdown ว่างลอยๆ
 * ======================================================================== */

export interface Result<T> {
  data: T
  error: string | null
}

/* ==========================================================================
 * ACTIVITIES
 * ======================================================================== */

/** ดึงกิจกรรมทั้งหมดที่เปิดใช้งาน เรียงตาม sort_order */
export async function getActivities(): Promise<Result<Activity[]>> {
  if (supabaseConfigError) {
    return { data: [], error: supabaseConfigError }
  }

  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[getActivities]', error.message)
    return { data: [], error: `เชื่อมต่อฐานข้อมูลไม่สำเร็จ: ${error.message}` }
  }

  const rows = (data ?? []) as Activity[]

  if (rows.length === 0) {
    return {
      data: [],
      error:
        'เชื่อมต่อได้ แต่ตาราง activities ไม่มีข้อมูล — รัน `npm run seed` หรือตรวจว่า RLS policy อนุญาตให้ anon อ่านได้',
    }
  }

  return { data: rows, error: null }
}

/** ดึงกิจกรรมเดียวจาก slug (ใช้ในหน้า /burn/[slug]) */
export async function getActivityBySlug(slug: string): Promise<Activity | null> {
  if (supabaseConfigError) return null

  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('[getActivityBySlug]', error.message)
    return null
  }

  return (data as Activity) ?? null
}

/* ==========================================================================
 * ROASTS
 * ======================================================================== */

/** คำด่าสำรอง เผื่อ DB ล่มหรือหมวดนั้นยังไม่มีข้อมูล — ห้ามปล่อยให้ผู้ใช้รอดพ้นการด่า */
const FALLBACK_ROASTS: string[] = [
  'ระบบจิกกัดล่มชั่วคราว แต่ตัวเลขบนตาชั่งไม่ได้ล่มตามไปด้วยนะ ลุกไปออกกำลังกายเดี๋ยวนี้!',
  'เน็ตมีปัญหา แต่พุงไม่มีปัญหาเลยสักนิด มันชัดเจนมาตั้งนานแล้ว ไปวิ่งซะ!',
]

/** ดึงคำจิกกัดทั้งหมดของหมวดหนึ่ง (เรียงตามความแรง) */
export async function getRoastsByCategory(category: string): Promise<Roast[]> {
  if (supabaseConfigError) return []

  const { data, error } = await supabase
    .from('roasts')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .order('intensity', { ascending: false })

  if (error) {
    console.error('[getRoastsByCategory]', error.message)
    return []
  }

  return (data ?? []) as Roast[]
}

/**
 * ดึง roast ทั้งหมดครั้งเดียว แล้วจัดกลุ่มตาม category
 * ใช้ใน getStaticPaths() เพื่อเลี่ยงปัญหา N+1 query ตอน build
 */
export async function getRoastsGroupedByCategory(): Promise<Record<string, Roast[]>> {
  if (supabaseConfigError) return {}

  const { data, error } = await supabase
    .from('roasts')
    .select('*')
    .eq('is_active', true)
    .order('intensity', { ascending: false })

  if (error) {
    console.error('[getRoastsGroupedByCategory]', error.message)
    return {}
  }

  const grouped: Record<string, Roast[]> = {}
  for (const roast of (data ?? []) as Roast[]) {
    ;(grouped[roast.category] ??= []).push(roast)
  }
  return grouped
}

/**
 * สุ่มคำด่า 1 ประโยคของกิจกรรมนั้นๆ
 *
 * หมายเหตุด้าน performance: จำนวน roast ต่อหมวดมีไม่กี่แถว การดึงมาสุ่มฝั่ง JS
 * ถูกกว่าการทำ RPC `order by random()` ที่ Postgres ต้อง scan ทั้งตาราง
 *
 * @param activitySlug slug ของกิจกรรม หรือ 'wall_of_shame'
 * @returns ข้อความคำด่า (มี fallback เสมอ — ไม่คืนค่าว่าง)
 */
export async function getRandomRoast(activitySlug: string): Promise<string> {
  const roasts = await getRoastsByCategory(activitySlug)

  if (roasts.length === 0) {
    return pickRandom(FALLBACK_ROASTS)
  }

  return pickRandom(roasts).message
}

/** สุ่มคำด่าประจาน สำหรับ Wall of Shame (คนหนีการฝึก) */
export async function getWallOfShameRoast(): Promise<string> {
  return getRandomRoast('wall_of_shame')
}

/* ==========================================================================
 * UTILS
 * ======================================================================== */

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}
