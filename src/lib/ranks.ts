/**
 * ranks.ts — ระบบยศ (Pure functions, ไม่แตะ DB)
 *
 * 2 แกน:
 *   ยศบวก    — คิดจาก "นาทีที่ชดใช้แล้วจริง" (total_paid_minutes)
 *   ยศประจาน — คิดจาก "หนี้ที่ยังค้าง" (debt_minutes)
 */

/**
 * กติกาของชื่อยศ: ห้ามอ้างอิงกีฬาชนิดใดชนิดหนึ่ง
 *
 * ยศแสดงผลเหมือนกันทุกคน แต่แต่ละคนเลือกกิจกรรมไม่เหมือนกัน
 * ถ้าเขียนว่า "หนีหน้าครูมวย" คนที่ว่ายน้ำหรือปั่นจักรยานจะอ่านแล้วไม่เกี่ยวกับตัวเอง
 * ข้อความจึงต้องจิกกัดที่ "พฤติกรรม" ไม่ใช่ที่ "ชนิดกีฬา"
 */
export interface RankTier {
  /** นาทีขั้นต่ำที่ต้องสะสมถึงจะได้ยศนี้ */
  minMinutes: number
  title: string
  emoji: string
  /** คำบรรยายยศแบบไม่ปลอบใจ */
  taunt: string
  /** class สีสำหรับ Tailwind */
  color: string
}

/** เรียงจากต่ำไปสูง — getRank() พึ่งพาลำดับนี้ */
export const RANK_TIERS: RankTier[] = [
  {
    minMinutes: 0,
    title: 'ตู้กับข้าวเคลื่อนที่',
    emoji: '🍱',
    taunt: 'กินอย่างเดียว ยังไม่เคยชดใช้สักนาที',
    color: 'text-neutral-400',
  },
  {
    minMinutes: 30,
    title: 'มือใหม่หัดหอบ',
    emoji: '😮‍💨',
    taunt: 'ครึ่งชั่วโมงแรกในชีวิต ปรบมือให้เบาๆ พอ ยังไม่ต้องรีบดีใจ',
    color: 'text-neutral-300',
  },
  {
    minMinutes: 120,
    title: 'หมูในอวยดิ้นได้',
    emoji: '🐷',
    taunt: 'เริ่มมีสัญญาณชีพ แต่ยังไม่มีอะไรน่าอวด',
    color: 'text-amber-300',
  },
  {
    minMinutes: 300,
    title: 'เริ่มเอาจริง',
    emoji: '🫡',
    taunt: 'ห้าชั่วโมงแล้ว เริ่มไม่ใช่พวกดีแต่พูดสินะ',
    color: 'text-amber-400',
  },
  {
    minMinutes: 600,
    title: 'สาวกเหงื่อ',
    emoji: '💦',
    taunt: 'สิบชั่วโมงแล้ว เริ่มติดใจการทรมานตัวเองสินะ',
    color: 'text-hazard',
  },
  {
    minMinutes: 1200,
    title: 'ตัวจริงเสียงจริง',
    emoji: '⚡',
    taunt: 'ยี่สิบชั่วโมง หัวใจแข็งแรงขึ้น ปากยังแข็งเหมือนเดิม',
    color: 'text-hazard',
  },
  {
    minMinutes: 2400,
    title: 'เครื่องเผาผลาญเคลื่อนที่',
    emoji: '🔥',
    taunt: 'กินเท่าไหร่ก็เอาอยู่ แต่เผลอเมื่อไหร่ ตาชั่งฟ้องทันที',
    color: 'text-orange-400',
  },
  {
    minMinutes: 4800,
    title: 'ร่างทรงเทพเจ้าเหงื่อ',
    emoji: '🗿',
    taunt: '80 ชั่วโมงแห่งความเจ็บปวด เริ่มน่ากลัวแล้ว',
    color: 'text-red-400',
  },
  {
    minMinutes: 9600,
    title: 'ตำนานผู้ไม่ปลอบใจใคร',
    emoji: '👑',
    taunt: 'ถึงจุดที่มีสิทธิ์จิกกัดคนอื่นได้แล้ว ใช้อำนาจให้คุ้ม',
    color: 'text-blood',
  },
]

export interface ShameTier {
  minMinutes: number
  title: string
  emoji: string
  taunt: string
}

/** ยศประจาน — ยิ่งค้างเยอะยิ่งน่าอาย */
export const SHAME_TIERS: ShameTier[] = [
  {
    minMinutes: 0,
    title: 'ไม่มีหนี้ค้าง',
    emoji: '✨',
    taunt: 'สะอาด ไม่มีอะไรให้ประจาน (ตอนนี้)',
  },
  {
    minMinutes: 1,
    title: 'ค้างนิดหน่อย',
    emoji: '🙂',
    taunt: 'ยังพอไถ่ทันถ้าลุกเดี๋ยวนี้',
  },
  {
    minMinutes: 60,
    title: 'เริ่มเนียน',
    emoji: '😅',
    taunt: 'ค้างเกินชั่วโมงแล้ว ทำเป็นลืมสินะ',
  },
  {
    minMinutes: 180,
    title: 'หนีหน้าตาชั่ง',
    emoji: '🫣',
    taunt: 'สามชั่วโมงที่ไม่เคยคิดจะใช้คืน กระจกยังจำได้อยู่นะ',
  },
  {
    minMinutes: 600,
    title: 'ลูกหนี้ชั้นเลว',
    emoji: '🚨',
    taunt: 'สิบชั่วโมง! นี่ไม่ใช่หนี้แล้ว นี่คือวิถีชีวิต',
  },
  {
    minMinutes: 1500,
    title: 'ประกาศจับ',
    emoji: '📢',
    taunt: 'ใครเจอตัวช่วยลากกลับมาที หนี้ท่วมหัวแล้วยังทำเป็นไม่รู้ไม่ชี้',
  },
]

/** ยศปัจจุบันจากนาทีที่ชดใช้แล้ว */
export function getRank(totalPaidMinutes: number): RankTier {
  const minutes = Math.max(0, totalPaidMinutes)
  let current = RANK_TIERS[0]!
  for (const tier of RANK_TIERS) {
    if (minutes >= tier.minMinutes) current = tier
    else break
  }
  return current
}

export interface RankProgress {
  current: RankTier
  /** null = ยศสูงสุดแล้ว */
  next: RankTier | null
  /** ต้องออกกำลังกายอีกกี่นาทีถึงจะขึ้นยศ */
  remainingMinutes: number
  /** ความคืบหน้าในยศปัจจุบัน 0–100 */
  percent: number
}

export function getRankProgress(totalPaidMinutes: number): RankProgress {
  const minutes = Math.max(0, totalPaidMinutes)
  const current = getRank(minutes)
  const index = RANK_TIERS.indexOf(current)
  const next = RANK_TIERS[index + 1] ?? null

  if (!next) {
    return { current, next: null, remainingMinutes: 0, percent: 100 }
  }

  const span = next.minMinutes - current.minMinutes
  const done = minutes - current.minMinutes

  return {
    current,
    next,
    remainingMinutes: next.minMinutes - minutes,
    percent: Math.min(100, Math.round((done / span) * 100)),
  }
}

/** ยศประจานจากหนี้ที่ค้าง */
export function getShameTier(debtMinutes: number): ShameTier {
  const minutes = Math.max(0, debtMinutes)
  let current = SHAME_TIERS[0]!
  for (const tier of SHAME_TIERS) {
    if (minutes >= tier.minMinutes) current = tier
    else break
  }
  return current
}

/** ขึ้นบอร์ดประจานเมื่อค้างเกินครึ่งชั่วโมง — ต่ำกว่านี้ถือว่ายังให้อภัยได้ */
export const SHAME_THRESHOLD_MINUTES = 30

/** ข้อความสตรีค */
export function formatStreak(days: number): string {
  if (days <= 0) return 'ยังไม่เริ่มนับ'
  if (days === 1) return 'เริ่มวันแรก'
  if (days < 7) return `ต่อเนื่อง ${days} วัน`
  if (days < 30) return `🔥 ต่อเนื่อง ${days} วัน`
  return `🔥🔥 ต่อเนื่อง ${days} วัน — โหดจริง`
}
