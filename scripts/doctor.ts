/**
 * doctor.ts — ตรวจสุขภาพการเชื่อมต่อ Supabase
 *
 * รัน: npm run doctor
 *
 * ตอบคำถามที่เสียเวลาหาที่สุด 3 ข้อ:
 *   1. .env ใส่ค่าจริงหรือยัง?
 *   2. ต่อฐานข้อมูลติดไหม / ตารางถูกสร้างหรือยัง?
 *   3. ทำไม anon อ่านไม่เห็นข้อมูล ทั้งที่ seed ไปแล้ว? (= RLS policy หาย)
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// Node < 22 ไม่มี global WebSocket — supabase-js สร้าง RealtimeClient เสมอตอน createClient
if (typeof globalThis.WebSocket === 'undefined') {
  const { WebSocket } = await import('ws')
  globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket
}

const TABLES = ['activities', 'roasts'] as const

let hasProblem = false

function ok(msg: string) {
  console.log(`  ✅ ${msg}`)
}
function bad(msg: string, fix?: string) {
  hasProblem = true
  console.log(`  ❌ ${msg}`)
  if (fix) console.log(`     → ${fix}`)
}
function info(msg: string) {
  console.log(`     ${msg}`)
}

function isPlaceholder(value: string): boolean {
  return (
    value.includes('xxxx') || value.includes('your-project') || value.endsWith('...')
  )
}

/* -------------------------------------------------------------------------- */
/*  1. ENV                                                                    */
/* -------------------------------------------------------------------------- */

console.log('\n🩺 ตรวจสุขภาพการเชื่อมต่อ Supabase\n')
console.log('[1/4] ตรวจไฟล์ .env')

const env = {
  SUPABASE_URL: process.env.SUPABASE_URL ?? '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  PUBLIC_SUPABASE_URL: process.env.PUBLIC_SUPABASE_URL ?? '',
  PUBLIC_SUPABASE_ANON_KEY: process.env.PUBLIC_SUPABASE_ANON_KEY ?? '',
}

for (const [key, value] of Object.entries(env)) {
  if (!value) {
    bad(`${key} ยังไม่ได้ตั้งค่า`, 'เพิ่มลงไฟล์ .env')
  } else if (isPlaceholder(value)) {
    bad(
      `${key} ยังเป็นค่าตัวอย่างจาก .env.example`,
      'คัดลอกค่าจริงจาก Supabase Dashboard > Project Settings > API',
    )
  } else {
    ok(`${key} ตั้งค่าแล้ว (${value.length} ตัวอักษร)`)
  }
}

if (env.SUPABASE_URL && env.PUBLIC_SUPABASE_URL && env.SUPABASE_URL !== env.PUBLIC_SUPABASE_URL) {
  bad(
    'SUPABASE_URL กับ PUBLIC_SUPABASE_URL ไม่ตรงกัน',
    'ทั้งสองตัวต้องชี้ไป project เดียวกัน ไม่งั้น seed เข้าที่หนึ่ง เว็บอ่านอีกที่หนึ่ง',
  )
}

/* ---- คีย์สลับตัว: พลาดง่ายมากเพราะทั้งคู่หน้าตาเหมือนกันและอยู่หน้าเดียวกัน ---- */

if (
  env.SUPABASE_SERVICE_ROLE_KEY &&
  env.SUPABASE_SERVICE_ROLE_KEY === env.PUBLIC_SUPABASE_ANON_KEY
) {
  bad(
    'SUPABASE_SERVICE_ROLE_KEY กับ PUBLIC_SUPABASE_ANON_KEY เป็นค่าเดียวกัน',
    'ก๊อปคีย์มาผิดตัว — service_role ต้องเป็นคนละคีย์กับ anon ไม่งั้น seed จะโดน RLS บล็อก',
  )
}

if (env.SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_publishable_')) {
  bad(
    'SUPABASE_SERVICE_ROLE_KEY ใส่ publishable key มา (ขึ้นต้นด้วย sb_publishable_)',
    'ต้องใช้ Secret key ที่ขึ้นต้นด้วย sb_secret_ จาก Project Settings > API Keys (กด Reveal ก่อน)',
  )
  info('คีย์ publishable ไม่มีสิทธิ์ข้าม RLS จึง insert ข้อมูลตอน seed ไม่ได้')
}

if (env.PUBLIC_SUPABASE_ANON_KEY.startsWith('sb_secret_')) {
  bad(
    '🚨 PUBLIC_SUPABASE_ANON_KEY ใส่ secret key มา — อันตรายมาก',
    'ค่าที่ขึ้นต้นด้วย PUBLIC_ จะถูกฝังลง JavaScript ที่ส่งไปเบราว์เซอร์ ใครก็อ่านได้',
  )
  info('เปลี่ยนเป็น publishable key ทันที แล้วไป revoke secret key ตัวนั้นทิ้งใน Dashboard')
}

if (hasProblem) {
  console.log('\n🛑 แก้ไฟล์ .env ให้เรียบร้อยก่อน แล้วรัน `npm run doctor` ใหม่\n')
  process.exit(1)
}

/* -------------------------------------------------------------------------- */
/*  2. CONNECTION + TABLES                                                    */
/* -------------------------------------------------------------------------- */

console.log('\n[2/4] ตรวจการเชื่อมต่อและตาราง (ใช้ service_role key)')

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const adminCounts: Record<string, number> = {}

/** ตารางหาย = PostgREST ตอบ PGRST205 หรือ Postgres ตอบ 42P01 */
function isMissingTable(error: { code?: string; message: string }): boolean {
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    error.message.includes('does not exist') ||
    error.message.includes('schema cache')
  )
}

const MISSING_TABLE_FIX =
  'ยังไม่ได้สร้างตาราง — เปิด Supabase Dashboard > SQL Editor แล้วรันไฟล์ supabase/schema.sql ทั้งไฟล์'

for (const table of TABLES) {
  // ห้ามใช้ head:true — supabase-js จะกลืน error 404 แล้วคืน count เป็น null
  // ทำให้ doctor รายงานว่า "ผ่าน" ทั้งที่ตารางไม่มีอยู่จริง
  const { count, error } = await admin.from(table).select('slug', { count: 'exact' }).limit(1)

  if (error) {
    bad(
      `ตาราง "${table}" อ่านไม่ได้: ${error.message}`,
      isMissingTable(error) ? MISSING_TABLE_FIX : 'ตรวจว่า service_role key ถูกต้อง',
    )
    adminCounts[table] = -1
    continue
  }

  if (count === null) {
    bad(`ตาราง "${table}" นับจำนวนแถวไม่ได้ (ตอบกลับว่าง)`, MISSING_TABLE_FIX)
    adminCounts[table] = -1
    continue
  }

  adminCounts[table] = count

  if (count === 0) {
    bad(`ตาราง "${table}" มีอยู่ แต่ยังไม่มีข้อมูล`, 'รัน `npm run seed`')
  } else {
    ok(`ตาราง "${table}" มี ${count} แถว`)
  }
}

/* -------------------------------------------------------------------------- */
/*  3. RLS — จุดที่พลาดกันบ่อยที่สุด                                            */
/* -------------------------------------------------------------------------- */

console.log('\n[3/4] ตรวจสิทธิ์การอ่านของ anon key (RLS)')

const anon = createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

for (const table of TABLES) {
  const total = adminCounts[table] ?? -1

  if (total < 0) {
    bad(`ข้ามการตรวจ RLS ของ "${table}" เพราะขั้นก่อนหน้าไม่ผ่าน`)
    continue
  }

  const { count, error } = await anon
    .from(table)
    .select('slug', { count: 'exact' })
    .eq('is_active', true)
    .limit(1)

  if (error) {
    bad(
      `anon อ่านตาราง "${table}" ไม่ได้: ${error.message}`,
      isMissingTable(error) ? MISSING_TABLE_FIX : undefined,
    )
    continue
  }

  const visible = count ?? 0

  if (visible === 0 && total > 0) {
    bad(
      `anon มองไม่เห็นข้อมูลในตาราง "${table}" เลย ทั้งที่มี ${total} แถว — RLS policy หาย`,
      'รันคำสั่งท้ายไฟล์ supabase/schema.sql (ส่วน create policy) ใน SQL Editor',
    )
    info('อาการนี้จะทำให้ dropdown เลือกกิจกรรมบนหน้าเว็บว่างเปล่า โดยไม่มี error')
  } else if (visible === 0) {
    bad(`anon อ่านตาราง "${table}" ได้ แต่ยังไม่มีข้อมูล`, 'รัน `npm run seed`')
  } else {
    ok(`anon อ่านตาราง "${table}" ได้ ${visible} แถว`)
  }
}

/* -------------------------------------------------------------------------- */
/*  4. ระบบยศ / จัดอันดับ (migration #2)                                       */
/* -------------------------------------------------------------------------- */

console.log('\n[4/4] ตรวจตารางระบบยศ / จัดอันดับ')

const RANK_TABLES = ['profiles', 'burn_logs'] as const
let rankMissing = false

for (const table of RANK_TABLES) {
  const { count, error } = await admin.from(table).select('id', { count: 'exact' }).limit(1)

  if (error) {
    if (isMissingTable(error)) {
      rankMissing = true
      continue
    }
    bad(`ตาราง "${table}" อ่านไม่ได้: ${error.message}`)
    continue
  }

  ok(`ตาราง "${table}" พร้อมใช้งาน (${count ?? 0} แถว)`)
}

if (rankMissing) {
  // ไม่ใช่ error: แอปหลักใช้งานได้อยู่ แค่ยังไม่มีระบบยศ
  console.log('  ⚠️  ยังไม่ได้ติดตั้งระบบยศ / จัดอันดับ')
  info('รันไฟล์ supabase/rank-schema.sql ใน SQL Editor เพื่อเปิดใช้หน้า /rank')
}

/* -------------------------------------------------------------------------- */

if (hasProblem) {
  console.log('\n🛑 เจอปัญหาข้างบน แก้ตามคำแนะนำแล้วรันใหม่\n')
  process.exit(1)
}

console.log('\n🎉 ทุกอย่างพร้อม — รัน `npm run dev` ได้เลย\n')
