/**
 * setup.ts — ตัวช่วยตั้งค่าโปรเจกต์แบบไล่ทีละด่าน
 *
 * รัน: npm run setup
 *
 * ต่างจาก `npm run doctor` ตรงที่ doctor แค่ "บอกว่าพัง" แต่ setup จะ "ลงมือแก้ให้"
 * เท่าที่ทำได้ — รัน seed ให้เอง และก๊อป SQL ที่ต้องใช้ใส่คลิปบอร์ดพร้อมลิงก์
 * (ขั้นตอนรัน SQL ทำแทนไม่ได้ เพราะต้องใช้สิทธิ์ระดับ database ที่ไม่ได้อยู่ใน .env)
 */

import 'dotenv/config'
import { execSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

if (typeof globalThis.WebSocket === 'undefined') {
  const { WebSocket } = await import('ws')
  globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket
}

/* ---------------------------------- utils --------------------------------- */

const b = (t: string) => `\x1b[1m${t}\x1b[0m`
const dim = (t: string) => `\x1b[2m${t}\x1b[0m`

function step(n: number, total: number, title: string) {
  console.log(`\n${b(`[${n}/${total}]`)} ${title}`)
}

/** ก๊อปข้อความใส่คลิปบอร์ด (macOS = pbcopy, Linux = xclip) */
function copyToClipboard(text: string): boolean {
  const cmd = process.platform === 'darwin' ? 'pbcopy' : 'xclip'
  const args = process.platform === 'darwin' ? [] : ['-selection', 'clipboard']
  const result = spawnSync(cmd, args, { input: text })
  return result.status === 0
}

function sqlEditorUrl(url: string): string {
  const ref = url.replace(/^https:\/\//, '').split('.')[0]
  return `https://supabase.com/dashboard/project/${ref}/sql/new`
}

/** พิมพ์คำสั่งให้ผู้ใช้ไปรัน SQL แล้วจบโปรแกรม */
function requireMigration(file: string, label: string, projectUrl: string): never {
  const sql = readFileSync(file, 'utf8')
  const copied = copyToClipboard(sql)

  console.log(`  ❌ ยังไม่ได้ติดตั้ง${label}`)
  console.log('')
  console.log(`  ${b('ทำ 3 ขั้นนี้:')}`)
  console.log(`   1. เปิด ${b(sqlEditorUrl(projectUrl))}`)
  console.log(
    copied
      ? `   2. กด ${b('Cmd+V')} (ก๊อป ${file} ใส่คลิปบอร์ดให้แล้ว) แล้วกด ${b('Run')}`
      : `   2. ก๊อปเนื้อหาไฟล์ ${b(file)} ไปวางแล้วกด ${b('Run')}`,
  )
  console.log(`   3. กลับมารัน ${b('npm run setup')} อีกครั้ง`)
  console.log('')
  process.exit(1)
}

function isMissingTable(error: { code?: string; message: string }): boolean {
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    error.message.includes('does not exist') ||
    error.message.includes('schema cache')
  )
}

/* ------------------------------- 1. ตรวจ .env ------------------------------ */

console.log(`\n🔧 ${b('ตั้งค่าโปรเจกต์ "ลดน้ำหนักไม่มีคำว่าปลอบใจ"')}`)

const TOTAL = 6
step(1, TOTAL, 'ตรวจไฟล์ .env')

const env = {
  SUPABASE_URL: process.env.SUPABASE_URL ?? '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  PUBLIC_SUPABASE_URL: process.env.PUBLIC_SUPABASE_URL ?? '',
  PUBLIC_SUPABASE_ANON_KEY: process.env.PUBLIC_SUPABASE_ANON_KEY ?? '',
}

const envProblems: string[] = []

for (const [key, value] of Object.entries(env)) {
  if (!value) envProblems.push(`${key} ยังไม่ได้ตั้งค่า`)
  else if (value.includes('xxxx') || value.endsWith('...'))
    envProblems.push(`${key} ยังเป็นค่าตัวอย่างจาก .env.example`)
}

if (env.SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_publishable_')) {
  envProblems.push('SUPABASE_SERVICE_ROLE_KEY ใส่ publishable key มา (ต้องเป็น sb_secret_)')
}
if (env.SUPABASE_SERVICE_ROLE_KEY === env.PUBLIC_SUPABASE_ANON_KEY && env.SUPABASE_URL) {
  envProblems.push('SUPABASE_SERVICE_ROLE_KEY กับ PUBLIC_SUPABASE_ANON_KEY เป็นค่าเดียวกัน')
}

if (envProblems.length > 0) {
  for (const problem of envProblems) console.log(`  ❌ ${problem}`)
  console.log('')
  console.log(`  แก้ไฟล์ ${b('.env')} แล้วรันใหม่ — ดูรายละเอียดด้วย ${b('npm run doctor')}`)
  console.log('')
  process.exit(1)
}

console.log('  ✅ ครบทั้ง 4 ตัว และไม่ได้ใส่คีย์สลับกัน')

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

/* --------------------------- 2. ตารางหลัก + ข้อมูล -------------------------- */

step(2, TOTAL, 'ตรวจตารางหลัก (activities / roasts)')

const { count: activityCount, error: activityError } = await admin
  .from('activities')
  .select('slug', { count: 'exact' })
  .limit(1)

if (activityError) {
  if (isMissingTable(activityError)) {
    requireMigration('supabase/schema.sql', 'ตารางหลัก', env.SUPABASE_URL)
  }
  console.log(`  ❌ อ่านตาราง activities ไม่ได้: ${activityError.message}`)
  process.exit(1)
}

console.log(`  ✅ ตารางหลักพร้อม (activities: ${activityCount ?? 0} แถว)`)

/* ------------------------------- 3. seed data ------------------------------ */

step(3, TOTAL, 'ตรวจข้อมูลตั้งต้น')

if ((activityCount ?? 0) === 0) {
  console.log('  ⏳ ยังไม่มีข้อมูล — กำลังรัน seed ให้อัตโนมัติ...\n')
  execSync('npx tsx scripts/seed.ts', { stdio: 'inherit' })
} else {
  console.log(`  ✅ มีข้อมูลแล้ว ${dim('(รัน `npm run seed` เองได้ถ้าอยากอัปเดต)')}`)
}

/* ------------------------------ 4. ระบบยศ ---------------------------------- */

step(4, TOTAL, 'ตรวจระบบยศ / จัดอันดับ')

const { count: profileCount, error: profileError } = await admin
  .from('profiles')
  .select('id', { count: 'exact' })
  .limit(1)

if (profileError) {
  if (isMissingTable(profileError)) {
    requireMigration('supabase/rank-schema.sql', 'ระบบยศ / จัดอันดับ', env.SUPABASE_URL)
  }
  console.log(`  ❌ อ่านตาราง profiles ไม่ได้: ${profileError.message}`)
  process.exit(1)
}

console.log(`  ✅ ระบบยศพร้อม (profiles: ${profileCount ?? 0} คน)`)

/* ---------------------------- 5. ข้อมูลร่างกาย ---------------------------- */

step(5, TOTAL, 'ตรวจข้อมูลร่างกายในโปรไฟล์ (BMR/TDEE)')

const { error: bodyError } = await admin.from('profiles').select('gender, height_cm, weight_kg, age').limit(1)

if (bodyError) {
  if (bodyError.message.includes('column') || bodyError.code === '42703') {
    requireMigration('supabase/profile-schema.sql', 'ข้อมูลร่างกายในโปรไฟล์', env.SUPABASE_URL)
  }
  console.log(`  ❌ ${bodyError.message}`)
  process.exit(1)
}

console.log('  ✅ โปรไฟล์เก็บ เพศ/ส่วนสูง/น้ำหนัก/อายุ ได้แล้ว')

/* ------------------------- 6. ผูกตัวตนกับ Auth ------------------------- */

step(6, TOTAL, 'ตรวจการผูกตัวตนกับ Supabase Auth')

const { error: userIdError } = await admin.from('profiles').select('user_id').limit(1)

if (userIdError) {
  if (userIdError.message.includes('column') || userIdError.code === '42703') {
    requireMigration('supabase/auth-schema.sql', 'การผูกตัวตนกับ Auth', env.SUPABASE_URL)
  }
  console.log(`  ❌ ${userIdError.message}`)
  process.exit(1)
}

// ตรวจว่าเปิด anonymous sign-in ไว้จริง ไม่งั้นผู้ใช้จะสร้างโปรไฟล์ไม่ได้เลย
const anonClient = createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})
const { error: signInError } = await anonClient.auth.signInAnonymously()

if (signInError) {
  bad(
    `anonymous sign-in ใช้ไม่ได้: ${signInError.message}`,
    'เปิดที่ Dashboard > Authentication > Providers > Allow anonymous sign-ins',
  )
  info('ถ้าไม่เปิด ผู้ใช้จะสร้างโปรไฟล์และบันทึกหนี้ไม่ได้เลย')
} else {
  ok('anonymous sign-in ใช้งานได้')
}

const { count: orphan } = await admin
  .from('profiles')
  .select('id', { count: 'exact' })
  .is('user_id', null)
  .limit(1)

if ((orphan ?? 0) > 0) {
  console.log(`  ℹ️  มีโปรไฟล์เก่า ${orphan} รายการที่ยังไม่มีเจ้าของ`)
  info('จะถูกอ้างสิทธิ์อัตโนมัติเมื่อเจ้าของกลับมาเปิดเว็บ (ใช้ device_id ที่เก็บในเครื่อง)')
} else {
  ok('โปรไฟล์ทุกรายการผูกกับผู้ใช้แล้ว')
}

/* --------------------------------- เสร็จ ---------------------------------- */

console.log(`\n🎉 ${b('พร้อมแล้ว')} — รัน ${b('npm run dev')} แล้วเปิด http://localhost:4321`)
console.log(`   หน้าจัดอันดับอยู่ที่ ${b('http://localhost:4321/rank')}\n`)
