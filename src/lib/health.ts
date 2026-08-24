/**
 * health.ts — คำนวณความต้องการพลังงานรายวัน (Pure functions)
 *
 * ใช้สูตร Mifflin-St Jeor ซึ่งเป็นสูตรที่ American Dietetic Association
 * แนะนำว่าแม่นที่สุดสำหรับคนทั่วไป (แม่นกว่า Harris-Benedict ที่เก่ากว่า)
 *
 *   ชาย:  BMR = 10×น้ำหนัก + 6.25×ส่วนสูง − 5×อายุ + 5
 *   หญิง: BMR = 10×น้ำหนัก + 6.25×ส่วนสูง − 5×อายุ − 161
 */

export type Gender = 'male' | 'female' | 'other'

export const GENDER_LABEL: Record<Gender, string> = {
  male: 'ชาย',
  female: 'หญิง',
  other: 'ไม่ระบุ',
}

/** ค่าพลังงานอ้างอิงต่อวันตามธงโภชนาการไทย ใช้เป็นตัวเทียบให้เห็นภาพ */
export const THAI_RDI: Record<Gender, number> = {
  male: 2000,
  female: 1600,
  other: 1800,
}

/**
 * ตัวคูณระดับกิจกรรม — ใช้ค่า "เคลื่อนไหวเบา" เป็นค่าตั้งต้น
 * เพราะคนที่เข้าเว็บนี้ส่วนใหญ่นั่งทำงานแล้วออกกำลังกายบ้าง
 * ไม่ถามเพิ่มเพื่อไม่ให้ฟอร์มยาวจนคนเลิกกรอกกลางคัน
 */
export const ACTIVITY_FACTOR = 1.375

export interface BodyProfile {
  gender: Gender
  /** เซนติเมตร */
  heightCm: number
  /** กิโลกรัม */
  weightKg: number
  age: number
}

/** อัตราการเผาผลาญขณะพัก (แคลอรี่ต่อวัน) */
export function calculateBMR({ gender, heightCm, weightKg, age }: BodyProfile): number {
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) return 0

  const base = 10 * weightKg + 6.25 * heightCm - 5 * age

  // เพศอื่น/ไม่ระบุ ใช้ค่ากลางระหว่างสองสูตร แทนที่จะบังคับเลือกข้าง
  const offset = gender === 'male' ? 5 : gender === 'female' ? -161 : -78

  return Math.round(base + offset)
}

/** พลังงานที่ใช้จริงต่อวัน = BMR × ตัวคูณกิจกรรม */
export function calculateTDEE(profile: BodyProfile): number {
  return Math.round(calculateBMR(profile) * ACTIVITY_FACTOR)
}

/** โควต้าต่อมื้อ — คิดจาก 3 มื้อหลักต่อวัน */
export function mealBudget(profile: BodyProfile): number {
  return Math.round(calculateTDEE(profile) / 3)
}

/** ดัชนีมวลกาย */
export function calculateBMI(weightKg: number, heightCm: number): number {
  if (weightKg <= 0 || heightCm <= 0) return 0
  return Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10
}

export type BmiBand = 'under' | 'normal' | 'over' | 'obese1' | 'obese2'

/** เกณฑ์ BMI สำหรับคนเอเชีย (WHO Asia-Pacific) ซึ่งเข้มกว่าเกณฑ์สากล */
export function getBmiBand(bmi: number): BmiBand {
  if (bmi < 18.5) return 'under'
  if (bmi < 23) return 'normal'
  if (bmi < 25) return 'over'
  if (bmi < 30) return 'obese1'
  return 'obese2'
}

export const BMI_LABEL: Record<BmiBand, string> = {
  under: 'ผอมเกินเกณฑ์',
  normal: 'อยู่ในเกณฑ์',
  over: 'ท้วม',
  obese1: 'อ้วนระดับ 1',
  obese2: 'อ้วนระดับ 2',
}

/* ==========================================================================
 * คำตัดสินของมื้อนี้
 * ======================================================================== */

export type MealVerdict = 'safe' | 'warn' | 'danger'

export interface MealJudgement {
  verdict: MealVerdict
  /** โควต้าต่อมื้อ (kcal) */
  budget: number
  /** เกินโควต้าไปกี่แคลอรี่ (0 = ไม่เกิน) */
  excess: number
  /** กินไปคิดเป็นกี่ % ของโควต้ามื้อนี้ */
  percent: number
}

/**
 * ตัดสินว่ามื้อนี้รอดหรือซวย
 *   safe   ≤ 100% ของโควต้า → นอนเฉยๆ ได้
 *   warn   ≤ 150%            → เกินนิดหน่อย ขยับหน่อยก็พอ
 *   danger > 150%            → ต้องชดใช้จริงจัง
 */
export function judgeMeal(kcal: number, profile: BodyProfile): MealJudgement {
  const budget = mealBudget(profile)
  if (budget <= 0) return { verdict: 'danger', budget: 0, excess: kcal, percent: 999 }

  const percent = Math.round((kcal / budget) * 100)
  const excess = Math.max(0, kcal - budget)

  const verdict: MealVerdict = percent <= 100 ? 'safe' : percent <= 150 ? 'warn' : 'danger'

  return { verdict, budget, excess, percent }
}

/* ==========================================================================
 * แปลงข้อมูลจาก DB
 * ======================================================================== */

/**
 * แปลง Profile จากฐานข้อมูลเป็นรูปแบบที่ฟังก์ชันในไฟล์นี้ใช้คำนวณได้
 * คืน null ถ้าข้อมูลร่างกายยังไม่ครบ (โปรไฟล์เก่าที่สมัครก่อนมีฟีเจอร์นี้)
 *
 * อยู่ในไฟล์นี้เพราะเป็นฟังก์ชันบริสุทธิ์ ไม่แตะ DB
 * ถ้าไปอยู่ใน profile.ts คนที่อยากใช้แค่ฟังก์ชันนี้จะต้องลาก supabase-js มาด้วย
 */
export function toBodyProfile(
  profile: {
    gender?: Gender | null
    height_cm?: number | null
    weight_kg?: number | null
    age?: number | null
  } | null,
): BodyProfile | null {
  if (!profile?.gender || !profile.height_cm || !profile.weight_kg || !profile.age) {
    return null
  }
  return {
    gender: profile.gender,
    heightCm: Number(profile.height_cm),
    weightKg: Number(profile.weight_kg),
    age: profile.age,
  }
}
