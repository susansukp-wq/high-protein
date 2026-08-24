/**
 * food-insights.ts — สร้างข้อมูลเชิงลึกเฉพาะของอาหารแต่ละเมนู
 *
 * ทำไมต้องมี:
 *   หน้า /food/* ทั้ง 184 หน้าใช้โครงเดียวกัน ต่างแค่ตัวเลขแคลอรี่
 *   วัดความเหมือนได้ 60% ซึ่งยังเสี่ยงถูกมองเป็น thin content
 *
 *   ไฟล์นี้คำนวณ "ข้อเท็จจริงเฉพาะเมนู" จากข้อมูลที่มีอยู่แล้ว
 *   ทำให้แต่ละหน้ามีตัวเลขและข้อความที่ไม่ซ้ำกันโดยไม่ต้องเขียนมือ 184 ครั้ง
 */

import type { FoodCategory, FoodItem } from '../data/popular-foods'
import type { Activity, ActivityGroup } from './types'
import { POPULAR_FOODS } from '../data/popular-foods'
import { DEFAULT_WEIGHT_KG, calculateBurnedCalories } from './calculator'
import { THAI_RDI } from './health'

/** ไขมัน 1 กิโลกรัม ≈ 7,700 แคลอรี่ (ค่ามาตรฐานที่ใช้ในโภชนาการ) */
const KCAL_PER_KG_FAT = 7700
const KCAL_PER_RICE_BOWL = 240
const KCAL_PER_BANANA = 100

/** ขึ้นบันได 1 ชั้นใช้เวลาราว 10 วินาที ที่ 8.0 METs */
const KCAL_PER_FLOOR = calculateBurnedCalories(10 / 60, DEFAULT_WEIGHT_KG, 8.0)
/** นอนเฉยๆ = 1.0 METs */
const KCAL_PER_HOUR_RESTING = calculateBurnedCalories(60, DEFAULT_WEIGHT_KG, 1.0)

export type KcalBand = 'tiny' | 'light' | 'normal' | 'heavy' | 'extreme'

export function getKcalBand(kcal: number): KcalBand {
  if (kcal < 150) return 'tiny'
  if (kcal < 350) return 'light'
  if (kcal < 650) return 'normal'
  if (kcal < 1200) return 'heavy'
  return 'extreme'
}

export const BAND_LABEL: Record<KcalBand, string> = {
  tiny: 'เบามาก',
  light: 'เบา',
  normal: 'ปานกลาง',
  heavy: 'หนัก',
  extreme: 'หนักมาก',
}

/** คำแนะนำที่ผสมระหว่างระดับพลังงานกับหมวดอาหาร ทำให้ข้อความต่างกันมากขึ้น */
const BAND_ADVICE: Record<KcalBand, string> = {
  tiny: 'เมนูนี้อยู่ในกลุ่มที่กินได้โดยแทบไม่ต้องคิด ปัญหาจะเกิดก็ต่อเมื่อกินหลายอย่างรวมกันในมื้อเดียว',
  light: 'อยู่ในเกณฑ์ที่จัดการง่าย ถ้าเลือกเมนูระดับนี้เป็นหลักจะคุมพลังงานทั้งวันได้โดยไม่ต้องอดอาหาร',
  normal: 'เป็นระดับของมื้อหลักทั่วไป กินได้ปกติแต่ต้องระวังของหวานหรือเครื่องดื่มที่จะตามมาทีหลัง',
  heavy: 'ระดับนี้กินมื้อเดียวก็กินโควต้าของทั้งวันไปเกือบครึ่ง ถ้าจะกินควรลดมื้ออื่นลงหรือวางแผนออกกำลังกายไว้ล่วงหน้า',
  extreme: 'มื้อเดียวเกินพลังงานที่ควรได้รับทั้งวัน การออกกำลังกายชดเชยให้หมดในวันเดียวแทบเป็นไปไม่ได้ ทางที่จริงกว่าคือลดปริมาณตั้งแต่แรก',
}

export interface FoodInsight {
  label: string
  value: string
}

export interface FoodAnalysis {
  band: KcalBand
  bandLabel: string
  advice: string
  /** ข้อเท็จจริงเฉพาะเมนูนี้ — ตัวเลขไม่ซ้ำกับเมนูอื่น */
  insights: FoodInsight[]
  /** อันดับพลังงานในหมวดเดียวกัน (1 = สูงสุด) */
  rankInCategory: number
  categorySize: number
  /** ค่าเฉลี่ยของหมวด */
  categoryAverage: number
  /** ต่างจากค่าเฉลี่ยหมวดกี่ % (บวก = สูงกว่า) */
  diffFromAverage: number
  /** เมนูที่พลังงานใกล้เคียงที่สุด ใช้ทำตารางเทียบ */
  neighbours: FoodItem[]
}

function averageKcal(category: FoodCategory): number {
  const items = POPULAR_FOODS.filter((f) => f.category === category)
  return Math.round(items.reduce((sum, f) => sum + f.kcal, 0) / items.length)
}

export function analyseFood(food: FoodItem): FoodAnalysis {
  const band = getKcalBand(food.kcal)

  const sameCategory = POPULAR_FOODS.filter((f) => f.category === food.category).sort(
    (a, b) => b.kcal - a.kcal,
  )
  const rankInCategory = sameCategory.findIndex((f) => f.slug === food.slug) + 1
  const categoryAverage = averageKcal(food.category)

  // เมนูที่พลังงานใกล้กันที่สุด ไม่จำกัดหมวด — ทำให้ตารางเทียบต่างกันทุกหน้า
  const neighbours = POPULAR_FOODS.filter((f) => f.slug !== food.slug)
    .map((f) => ({ food: f, gap: Math.abs(f.kcal - food.kcal) }))
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 5)
    .map((row) => row.food)

  const dailyPercent = Math.round((food.kcal / THAI_RDI.male) * 100)
  const monthlyExcessKg = Math.round((food.kcal * 30) / KCAL_PER_KG_FAT / 0.1) / 10

  const insights: FoodInsight[] = [
    {
      label: 'เทียบกับข้าวสวย',
      value: `${Math.round((food.kcal / KCAL_PER_RICE_BOWL) * 10) / 10} จาน`,
    },
    {
      label: 'เทียบกับกล้วยหอม',
      value: `${Math.round(food.kcal / KCAL_PER_BANANA)} ลูก`,
    },
    {
      label: 'เดินขึ้นบันได',
      value: `${Math.round(food.kcal / KCAL_PER_FLOOR).toLocaleString()} ชั้น`,
    },
    {
      label: 'นอนเฉยๆ ให้หมด',
      value: `${Math.round((food.kcal / KCAL_PER_HOUR_RESTING) * 10) / 10} ชั่วโมง`,
    },
    {
      label: 'ของพลังงานทั้งวัน',
      value: `${dailyPercent}%`,
    },
    {
      label: 'ถ้ากินเกินทุกวัน 1 เดือน',
      value: `ไขมัน +${monthlyExcessKg} กก.`,
    },
  ]

  return {
    band,
    bandLabel: BAND_LABEL[band],
    advice: BAND_ADVICE[band],
    insights,
    rankInCategory,
    categorySize: sameCategory.length,
    categoryAverage,
    diffFromAverage: Math.round(((food.kcal - categoryAverage) / categoryAverage) * 100),
    neighbours,
  }
}

/* ==========================================================================
 * เลือกกิจกรรมที่จะโชว์ในตาราง
 * ------------------------------------------------------------------------
 * เดิมทุกหน้าโชว์กิจกรรมครบ 21 รายการเหมือนกันหมด ซึ่งเป็นก้อนเนื้อหาที่ใหญ่
 * ที่สุดในหน้าและทำให้ 184 หน้าเหมือนกันเกินไป
 *
 * แผนที่ด้านล่างจับคู่หมวดอาหารกับกลุ่มกิจกรรมที่สมเหตุสมผล
 * เมนูหนักจับคู่กับกีฬาหนัก เมนูเบาจับคู่กับกิจกรรมเบา
 * ======================================================================== */

const CATEGORY_AFFINITY: Record<FoodCategory, ActivityGroup[]> = {
  buffet: ['fighter', 'cardio'],
  fastfood: ['fighter', 'cardio'],
  fried: ['cardio', 'fighter'],
  grill: ['cardio', 'fighter'],
  rice_dish: ['cardio', 'daily'],
  noodle: ['cardio', 'soft'],
  asian: ['fighter', 'cardio'],
  alcohol: ['cardio', 'fighter'],
  dessert: ['cardio', 'no_excuse'],
  thai_dessert: ['soft', 'daily'],
  drink: ['no_excuse', 'cardio'],
  snack: ['no_excuse', 'daily'],
  soup: ['soft', 'daily'],
  seafood: ['soft', 'cardio'],
  isan: ['daily', 'soft'],
  breakfast: ['daily', 'soft'],
  fruit: ['no_excuse', 'daily'],
  clean: ['soft', 'daily'],
}

/** จำนวนกิจกรรมที่โชว์ต่อหน้า */
const ACTIVITY_LIMIT = 10

/**
 * เลือกกิจกรรมที่จะแสดงในหน้าอาหาร
 * เอากลุ่มที่เข้ากับหมวดอาหารก่อน แล้วเติมจากกลุ่มที่เหลือให้ครบตามจำนวน
 */
export function pickActivitiesForFood(food: FoodItem, activities: Activity[]): Activity[] {
  const preferred = CATEGORY_AFFINITY[food.category] ?? []

  const inPreferred = activities.filter((a) => preferred.includes(a.group_key))
  const rest = activities.filter((a) => !preferred.includes(a.group_key))

  // สลับลำดับกลุ่มที่เหลือตามความยาวชื่อเมนู เพื่อให้แต่ละหน้าได้ชุดที่ไม่ซ้ำกัน
  const offset = food.name.length % Math.max(rest.length, 1)
  const rotated = [...rest.slice(offset), ...rest.slice(0, offset)]

  return [...inPreferred, ...rotated].slice(0, ACTIVITY_LIMIT)
}
