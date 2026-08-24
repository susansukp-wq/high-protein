/**
 * OG image endpoint — สร้างไฟล์ .png นิ่งๆ ตอน build (ไม่ใช่ตอนมีคนเรียก)
 *
 * Astro จะเขียนผลลัพธ์ลง dist/og/<slug>.png ตอน build
 * เสิร์ฟจาก CDN เหมือนไฟล์รูปทั่วไป — ไม่มี server ไม่มีค่า API
 */

import type { APIRoute } from 'astro'
import { renderOgImage, type OgCardInput } from '../../lib/og'
import { getActivities } from '../../lib/supabase'
import { DEFAULT_WEIGHT_KG, calculateBurnTime, formatDuration } from '../../lib/calculator'
import { HERO_FOOD, POPULAR_FOODS } from '../../data/popular-foods'

export async function getStaticPaths() {
  const { data: activities } = await getActivities()

  const staticCards: { slug: string; card: OgCardInput }[] = [
    {
      slug: 'home',
      card: {
        eyebrow: 'เขตห้ามปลอบใจ',
        title: 'กินไปเท่าไหร่ ก็ต้องชดใช้เท่านั้น',
        subtitle: 'บอกมาว่ากินอะไร แล้วเราจะบอกว่าต้องออกกำลังกายกี่นาที',
      },
    },
    {
      slug: 'rank',
      card: {
        eyebrow: 'สนามประลอง · 9 ยศ',
        title: 'ยศไม่ได้มาจากคำพูด',
        highlight: 'มาจากนาทีที่เหนื่อยจริง',
        subtitle: 'สะสมเวลาออกกำลังกาย ไต่จากตู้กับข้าวเคลื่อนที่ถึงตำนาน',
        tone: 'danger',
      },
    },
  ]

  const activityCards = activities.map((activity) => {
    const minutes = calculateBurnTime(HERO_FOOD.kcal, DEFAULT_WEIGHT_KG, activity.mets)
    return {
      slug: activity.slug,
      card: {
        eyebrow: `${activity.name_en.toUpperCase()} · METs ${activity.mets}`,
        title: `กิน${HERO_FOOD.name} ต้อง${activity.name_th}`,
        highlight: formatDuration(minutes),
        subtitle: `คำนวณที่น้ำหนัก ${DEFAULT_WEIGHT_KG} กก. · ${HERO_FOOD.kcal.toLocaleString()} แคลอรี่`,
        tone: minutes >= 240 ? ('danger' as const) : ('hazard' as const),
      } satisfies OgCardInput,
    }
  })

  // การ์ดรายเมนู — prefix 'food-' กันชนกับ slug ของกิจกรรม
  const foodCards = POPULAR_FOODS.map((food) => {
    const percent = Math.round((food.kcal / 2000) * 100)
    return {
      slug: `food-${food.slug}`,
      card: {
        eyebrow: `${food.serving} · ${percent}% ของพลังงานทั้งวัน`,
        title: `${food.name} กี่แคลอรี่?`,
        highlight: `${food.kcal.toLocaleString()} kcal`,
        subtitle: `เทียบเท่าข้าวสวย ${Math.round((food.kcal / 240) * 10) / 10} จาน`,
        tone: food.kcal >= 800 ? ('danger' as const) : ('hazard' as const),
      } satisfies OgCardInput,
    }
  })

  return [...staticCards, ...activityCards, ...foodCards].map(({ slug, card }) => ({
    params: { slug },
    props: { card },
  }))
}

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOgImage(props.card as OgCardInput)

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
