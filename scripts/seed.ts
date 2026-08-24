/**
 * ============================================================================
 *  seed.ts — Seed Data Script
 *  Project: "ลดน้ำหนักไม่มีคำว่าปลอบใจ" (Astro + Supabase)
 * ----------------------------------------------------------------------------
 *  รัน:  npm run seed            → upsert ข้อมูลทั้งหมด (idempotent, รันซ้ำได้)
 *        npm run seed -- --fresh → ลบข้อมูลเดิมทิ้งก่อน แล้ว insert ใหม่
 *        npm run seed -- --dry-run → แค่ validate + preview ไม่ยิงเข้า DB
 * ----------------------------------------------------------------------------
 *  สูตรคำนวณแคลอรี่ที่ใช้ METs:
 *    kcal = METs × 3.5 × weightKg / 200 × durationMinutes
 *    ดังนั้น "ต้องออกกำลังกายกี่นาที" = (kcal × 200) / (METs × 3.5 × weightKg)
 * ============================================================================
 */

import 'dotenv/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
// ใช้ type ชุดเดียวกับฝั่งแอป — แก้ที่เดียว ไม่ต้องตามแก้สองที่
import type { ActivityInsert as Activity, RoastInsert as Roast } from '../src/lib/types'

export type { Activity, Roast }

// Node < 22 ไม่มี global WebSocket แต่ createClient() สร้าง RealtimeClient เสมอ
if (typeof globalThis.WebSocket === 'undefined') {
  const { WebSocket } = await import('ws')
  globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket
}

/* ==========================================================================
 * 2) SEED DATA — ACTIVITIES
 * ======================================================================== */

export const ACTIVITIES: Activity[] = [
  /* ---------------- 🥊 สายปะทะ / ลูกผู้ชาย ---------------- */
  {
    slug: 'football',
    name_th: 'ฟุตบอล',
    name_en: 'Football',
    mets: 10.0,
    group_key: 'fighter',
    emoji: '⚽',
    seo_title: 'เตะบอล 1 ชั่วโมง เบิร์นกี่แคล? คำนวณจาก METs 10.0',
    seo_description:
      'คำนวณแคลอรี่ที่เผาผลาญจากการเล่นฟุตบอลตามน้ำหนักตัวจริง พร้อมคำจิกกัดที่ทำให้คุณลุกไปลงสนามเดี๋ยวนี้',
    keywords: ['เตะบอลเบิร์นกี่แคล', 'ฟุตบอล แคลอรี่', 'METs ฟุตบอล', 'ลดน้ำหนัก เล่นบอล'],
    sort_order: 10,
    is_active: true,
  },
  {
    slug: 'muay_thai',
    name_th: 'มวยไทย',
    name_en: 'Muay Thai',
    mets: 10.0,
    group_key: 'fighter',
    emoji: '🥊',
    seo_title: 'ต่อยมวยไทย 1 ชั่วโมง เบิร์นกี่แคลอรี่? (METs 10.0)',
    seo_description:
      'ซ้อมมวยไทย เตะกระสอบ ชกลม เบิร์นแคลอรี่ได้เท่าไหร่ คำนวณตามน้ำหนักตัวคุณ พร้อมคำด่าฟรีไม่คิดเงิน',
    keywords: ['มวยไทย เบิร์นกี่แคล', 'ต่อยมวย ลดน้ำหนัก', 'METs มวยไทย', 'เตะกระสอบ แคลอรี่'],
    sort_order: 11,
    is_active: true,
  },
  {
    slug: 'basketball',
    name_th: 'บาสเกตบอล',
    name_en: 'Basketball',
    mets: 8.0,
    group_key: 'fighter',
    emoji: '🏀',
    seo_title: 'เล่นบาส 1 ชั่วโมง เบิร์นกี่แคล? คำนวณจาก METs 8.0',
    seo_description:
      'วิ่งคอร์ตบาสเผาผลาญแคลอรี่เท่าไหร่ คำนวณจากน้ำหนักตัวจริง พร้อมคำจิกกัดสำหรับคนชู้ตไม่ลง',
    keywords: ['บาสเกตบอล แคลอรี่', 'เล่นบาส ลดน้ำหนัก', 'METs บาส'],
    sort_order: 12,
    is_active: true,
  },
  {
    slug: 'badminton',
    name_th: 'แบดมินตัน',
    name_en: 'Badminton',
    mets: 7.0,
    group_key: 'fighter',
    emoji: '🏸',
    seo_title: 'ตีแบด 1 ชั่วโมง เบิร์นกี่แคลอรี่? (METs 7.0)',
    seo_description:
      'ตีแบดมินตันลดน้ำหนักได้จริงไหม เบิร์นกี่แคล คำนวณตามน้ำหนักตัว พร้อมคำจิกกัดสำหรับคนตีแป๊ก',
    keywords: ['ตีแบด เบิร์นกี่แคล', 'แบดมินตัน ลดน้ำหนัก', 'METs แบดมินตัน'],
    sort_order: 13,
    is_active: true,
  },
  {
    slug: 'rock_climbing',
    name_th: 'ปีนหน้าผาจำลอง',
    name_en: 'Rock Climbing',
    mets: 8.0,
    group_key: 'fighter',
    emoji: '🧗',
    seo_title: 'ปีนผาจำลอง 1 ชั่วโมง เบิร์นกี่แคล? (METs 8.0)',
    seo_description:
      'Bouldering / ปีนหน้าผาจำลอง เผาผลาญแคลอรี่เท่าไหร่ คำนวณตามน้ำหนักตัว พร้อมคำเตือนจากเชือกสลิง',
    keywords: ['ปีนหน้าผา แคลอรี่', 'bouldering ลดน้ำหนัก', 'METs rock climbing'],
    sort_order: 14,
    is_active: true,
  },

  /* ---------------- 🏃 สายคาร์ดิโอ หอบจนพูดไม่ออก ---------------- */
  {
    slug: 'running',
    name_th: 'วิ่ง',
    name_en: 'Running',
    mets: 9.8,
    group_key: 'cardio',
    emoji: '🏃',
    seo_title: 'วิ่ง 1 ชั่วโมง เบิร์นกี่แคล? คำนวณจาก METs 9.8',
    seo_description:
      'วิ่งเพซเท่าไหร่ กี่กิโล ถึงจะหมดหนี้แคลอรี่มื้อเมื่อคืน คำนวณจากน้ำหนักตัวจริงแบบไม่ปลอบใจ',
    keywords: ['วิ่งเบิร์นกี่แคล', 'วิ่งลดน้ำหนัก', 'METs วิ่ง', 'วิ่ง 10 กิโล แคลอรี่'],
    sort_order: 20,
    is_active: true,
  },
  {
    slug: 'running_from_dogs',
    name_th: 'วิ่งหนีหมาซอยเปลี่ยว',
    name_en: 'Running from Stray Dogs',
    mets: 11.0,
    group_key: 'cardio',
    emoji: '🐕',
    seo_title: 'วิ่งหนีหมา 30 นาที เบิร์นกี่แคล? สปรินต์ METs 11.0',
    seo_description:
      'คาร์ดิโอที่แรงที่สุดในไทย วิ่งสปรินต์หนีหมาหมู่ เบิร์นแคลอรี่ระดับ METs 11.0 รอดก็ผอม ไม่รอดก็ฉีดยากันบาดทะยัก',
    keywords: ['วิ่งสปรินต์ แคลอรี่', 'HIIT เบิร์นกี่แคล', 'METs sprint'],
    sort_order: 21,
    is_active: true,
  },
  {
    slug: 'cycling',
    name_th: 'ปั่นจักรยาน',
    name_en: 'Cycling',
    mets: 8.5,
    group_key: 'cardio',
    emoji: '🚴',
    seo_title: 'ปั่นจักรยาน 1 ชั่วโมง เบิร์นกี่แคล? (METs 8.5)',
    seo_description:
      'ปั่นจักรยานกี่กิโลถึงจะล้างหนี้ของหวานมื้อบ่าย คำนวณแคลอรี่ตามน้ำหนักตัวจริง',
    keywords: ['ปั่นจักรยาน เบิร์นกี่แคล', 'จักรยาน ลดน้ำหนัก', 'METs cycling'],
    sort_order: 22,
    is_active: true,
  },
  {
    slug: 'swimming',
    name_th: 'ว่ายน้ำ',
    name_en: 'Swimming',
    mets: 7.0,
    group_key: 'cardio',
    emoji: '🏊',
    seo_title: 'ว่ายน้ำ 1 ชั่วโมง เบิร์นกี่แคลอรี่? (METs 7.0)',
    seo_description:
      'ว่ายน้ำกี่เที่ยวสระถึงจะหมดหนี้หมูกรอบ คำนวณแคลอรี่ตามน้ำหนักตัว ห้ามเกาะขอบสระคุยกับเพื่อน',
    keywords: ['ว่ายน้ำ เบิร์นกี่แคล', 'ว่ายน้ำ ลดน้ำหนัก', 'METs swimming'],
    sort_order: 23,
    is_active: true,
  },
  {
    slug: 'dancing',
    name_th: 'เต้น (Zumba / K-Pop Cover)',
    name_en: 'Dancing',
    mets: 6.5,
    group_key: 'cardio',
    emoji: '💃',
    seo_title: 'เต้น Zumba / คัฟเวอร์ 1 ชั่วโมง เบิร์นกี่แคล? (METs 6.5)',
    seo_description:
      'เต้นซุมบ้าหรือคัฟเวอร์เพลงเกาหลี เบิร์นแคลอรี่ได้เท่าไหร่ คำนวณตามน้ำหนักตัวจริง',
    keywords: ['เต้นเบิร์นกี่แคล', 'zumba ลดน้ำหนัก', 'คัฟเวอร์เต้น แคลอรี่', 'METs dancing'],
    sort_order: 24,
    is_active: true,
  },
  {
    slug: 'weight_training',
    name_th: 'เวทเทรนนิ่ง / Hyrox',
    name_en: 'Weight Training',
    mets: 8.0,
    group_key: 'cardio',
    emoji: '🏋️',
    seo_title: 'เวทเทรนนิ่ง / Hyrox 1 ชั่วโมง เบิร์นกี่แคล? (METs 8.0)',
    seo_description:
      'เข็นเลื่อน ลากเหล็ก เล่นเวทหนัก เบิร์นแคลอรี่เท่าไหร่ คำนวณตามน้ำหนักตัวจริงแบบไม่ปลอบใจ',
    keywords: ['เวทเทรนนิ่ง แคลอรี่', 'hyrox เบิร์นกี่แคล', 'เล่นเวท ลดน้ำหนัก', 'METs weight training'],
    sort_order: 25,
    is_active: true,
  },

  /* ---------------- 🧘 ลูกคุณหนู สายซอฟต์ ---------------- */
  {
    slug: 'yoga',
    name_th: 'โยคะ / พิลาทิส',
    name_en: 'Yoga / Pilates',
    mets: 3.5,
    group_key: 'soft',
    emoji: '🧘',
    seo_title: 'โยคะ / พิลาทิส 1 ชั่วโมง เบิร์นกี่แคล? (METs 3.5)',
    seo_description:
      'เล่นโยคะหรือพิลาทิสลดน้ำหนักได้จริงไหม เบิร์นกี่แคล คำนวณตามน้ำหนักตัว พร้อมความจริงที่สายซอฟต์ไม่อยากได้ยิน',
    keywords: ['โยคะ เบิร์นกี่แคล', 'พิลาทิส ลดน้ำหนัก', 'METs yoga', 'โยคะ แคลอรี่'],
    sort_order: 30,
    is_active: true,
  },
  {
    slug: 'golf',
    name_th: 'กอล์ฟ',
    name_en: 'Golf',
    mets: 4.5,
    group_key: 'soft',
    emoji: '⛳',
    seo_title: 'เดินตีกอล์ฟ 18 หลุม เบิร์นกี่แคล? (METs 4.5)',
    seo_description:
      'ออกรอบกอล์ฟแบบเดิน ไม่ใช้รถกอล์ฟ เบิร์นแคลอรี่เท่าไหร่ คำนวณตามน้ำหนักตัวจริง',
    keywords: ['กอล์ฟ เบิร์นกี่แคล', 'ตีกอล์ฟ ลดน้ำหนัก', 'METs golf'],
    sort_order: 31,
    is_active: true,
  },
  {
    slug: 'surfskate',
    name_th: 'เซิร์ฟสเก็ต / สเก็ตบอร์ด',
    name_en: 'Surfskate / Skateboard',
    mets: 5.0,
    group_key: 'soft',
    emoji: '🛹',
    seo_title: 'เซิร์ฟสเก็ต 1 ชั่วโมง เบิร์นกี่แคล? (METs 5.0)',
    seo_description:
      'ไถเซิร์ฟสเก็ตหรือสเก็ตบอร์ด เผาผลาญแคลอรี่เท่าไหร่ คำนวณตามน้ำหนักตัว ทรงอย่างแบดแต่หุ่นอย่างบวม',
    keywords: ['เซิร์ฟสเก็ต แคลอรี่', 'surfskate ลดน้ำหนัก', 'สเก็ตบอร์ด เบิร์นกี่แคล'],
    sort_order: 32,
    is_active: true,
  },
  {
    slug: 'sexual_activity',
    name_th: 'เพศสัมพันธ์',
    name_en: 'Sexual Activity',
    mets: 3.5,
    group_key: 'soft',
    emoji: '🛏️',
    seo_title: 'มีเซ็กส์ 1 ชั่วโมง เบิร์นกี่แคลอรี่จริง? (METs 3.5)',
    seo_description:
      'ความจริงที่ไม่มีใครกล้าบอก ว่ากิจกรรมบนเตียงเบิร์นแคลอรี่ได้น้อยแค่ไหน คำนวณตามน้ำหนักตัวจริง',
    keywords: ['เซ็กส์ เบิร์นกี่แคล', 'มีอะไรกัน แคลอรี่', 'METs sexual activity'],
    sort_order: 33,
    is_active: true,
  },

  /* ---------------- 🤡 สายขี้เกียจ / No Excuse ---------------- */
  {
    slug: 'housework',
    name_th: 'ทำงานบ้าน',
    name_en: 'Housework',
    mets: 3.0,
    group_key: 'daily',
    emoji: '🧹',
    seo_title: 'ทำงานบ้าน 1 ชั่วโมง เบิร์นกี่แคล? (METs 3.0)',
    seo_description:
      'ซักผ้า ถูบ้าน ล้างห้องน้ำ เบิร์นแคลอรี่ได้เท่าไหร่ คำนวณตามน้ำหนักตัว ออกกำลังกายไปด้วย บ้านสะอาดไปด้วย',
    keywords: ['ทำงานบ้าน เบิร์นกี่แคล', 'ถูบ้าน แคลอรี่', 'METs housework'],
    sort_order: 40,
    is_active: true,
  },
  {
    slug: 'shopping',
    name_th: 'เดินช้อปปิ้ง / เดินห้าง',
    name_en: 'Shopping',
    mets: 2.5,
    group_key: 'no_excuse',
    emoji: '🛍️',
    seo_title: 'เดินห้าง / เดินจตุจักร 1 ชั่วโมง เบิร์นกี่แคล? (METs 2.5)',
    seo_description:
      'เดินช้อปปิ้งถือเป็นการออกกำลังกายไหม เบิร์นกี่แคล คำนวณตามน้ำหนักตัวจริง (ห้ามแวะกินชานมไข่มุก)',
    keywords: ['เดินห้าง เบิร์นกี่แคล', 'เดินช้อปปิ้ง แคลอรี่', 'เดินจตุจักร ลดน้ำหนัก'],
    sort_order: 41,
    is_active: true,
  },
  {
    slug: 'standing_on_bus',
    name_th: 'โหนรถเมล์',
    name_en: 'Standing on Bus',
    mets: 2.0,
    group_key: 'no_excuse',
    emoji: '🚌',
    seo_title: 'โหนรถเมล์ 1 ชั่วโมง เบิร์นกี่แคล? (METs 2.0)',
    seo_description:
      'ยืนโหนรถเมล์ตอนรถติดเบิร์นแคลอรี่ได้เท่าไหร่ คำนวณตามน้ำหนักตัว การออกกำลังกายของมนุษย์เงินเดือน',
    keywords: ['โหนรถเมล์ แคลอรี่', 'ยืนเบิร์นกี่แคล', 'METs standing'],
    sort_order: 42,
    is_active: true,
  },
  {
    slug: 'karaoke',
    name_th: 'ร้องคาราโอเกะ',
    name_en: 'Karaoke',
    mets: 2.0,
    group_key: 'no_excuse',
    emoji: '🎤',
    seo_title: 'ร้องคาราโอเกะ 1 ชั่วโมง เบิร์นกี่แคล? (METs 2.0)',
    seo_description:
      'แหกปากร้องเพลงร็อกเบิร์นแคลอรี่ได้จริงไหม กี่เพลงถึงจะหมดหนี้มื้อดึก คำนวณตามน้ำหนักตัว',
    keywords: ['ร้องเพลง เบิร์นกี่แคล', 'คาราโอเกะ แคลอรี่', 'METs singing'],
    sort_order: 43,
    is_active: true,
  },
  {
    slug: 'arguing_with_partner',
    name_th: 'เถียงกับแฟน',
    name_en: 'Arguing with Partner',
    mets: 1.5,
    group_key: 'no_excuse',
    emoji: '💔',
    seo_title: 'เถียงกับแฟน 1 ชั่วโมง เบิร์นกี่แคล? (METs 1.5)',
    seo_description:
      'ทะเลาะกับแฟนเบิร์นแคลอรี่ได้เท่าไหร่ คำนวณตามน้ำหนักตัวจริง เผลอๆ ได้เดินหาที่นอนใหม่ เบิร์นเพิ่มอีกเด้ง',
    keywords: ['เถียงกับแฟน แคลอรี่', 'ทะเลาะ เบิร์นกี่แคล', 'METs arguing'],
    sort_order: 44,
    is_active: true,
  },
  {
    slug: 'scrolling_phone',
    name_th: 'นอนไถมือถือ',
    name_en: 'Scrolling Phone',
    mets: 1.0,
    group_key: 'no_excuse',
    emoji: '📱',
    seo_title: 'นอนไถมือถือ 1 ชั่วโมง เบิร์นกี่แคล? (METs 1.0)',
    seo_description:
      'นอนเลื่อนฟีดทั้งวันเบิร์นแคลอรี่ได้เท่าไหร่ คำตอบคือน้อยจนน่าตกใจ คำนวณตามน้ำหนักตัวจริงของคุณ',
    keywords: ['นอนไถมือถือ แคลอรี่', 'นอนเฉยๆ เบิร์นกี่แคล', 'METs 1.0', 'BMR'],
    sort_order: 45,
    is_active: true,
  },
]

/* ==========================================================================
 * 3) SEED DATA — ROASTS (คำจิกกัด)
 *    หมายเหตุ: category ต้องตรงกับ Activity.slug ยกเว้น 'wall_of_shame'
 * ======================================================================== */

export const ROASTS: Roast[] = [
  /* ---------------- ⚽ FOOTBALL ---------------- */
  {
    slug: 'football_01',
    category: 'football',
    message:
      'ยัดเข้าไปขนาดนี้ ไปวิ่งไล่บอล 2 ชั่วโมงรวด! และถ้ายิงหรือแอสซิสต์ไม่ถึง 3 ลูก ไม่ต้องเรียกตัวเองว่านักบอล เรียกตู้กับข้าวเคลื่อนที่เถอะ อย่าให้สนามเสียชื่อ!',
    intensity: 5,
    is_active: true,
  },
  {
    slug: 'football_02',
    category: 'football',
    message:
      'ซัดบุฟเฟต์ 3 รอบ แต่ลงสนามได้ 10 นาทีก็ขอเปลี่ยนตัว! กลับไปวิ่งรอบสนามให้ครบ 20 รอบก่อน ค่อยมาเถียง ตัวสำรองถาวร!',
    intensity: 4,
    is_active: true,
  },

  /* ---------------- 🥊 MUAY THAI ---------------- */
  {
    slug: 'muay_thai_01',
    category: 'muay_thai',
    message:
      'กินดุขนาดนี้ ไปเตะกระสอบทราย 2 ชั่วโมงรวด! ถ้าเตะจนหอบแล้วยังเบิร์นไม่หมด ก็ให้ครูมวยเตะก้านคอสลบไปเลย จะได้ไม่ต้องกินเพิ่ม!',
    intensity: 5,
    is_active: true,
  },
  {
    slug: 'muay_thai_02',
    category: 'muay_thai',
    message:
      'หมัดเบาหวิว แต่มือหนักตอนตักข้าวเนี่ยนะ! ไปกระโดดเชือก 30 นาทีให้ครบก่อน ค่อยมาคุยเรื่องขึ้นชก นักมวยรุ่นพุงกลาง!',
    intensity: 4,
    is_active: true,
  },

  /* ---------------- 🏀 BASKETBALL ---------------- */
  {
    slug: 'basketball_01',
    category: 'basketball',
    message:
      'แคลเกินเบอร์มาก! ไปวิ่งคอร์ตบาสสัก 2 ชั่วโมง ถ้าชู้ตไม่ลงเกิน 10 ลูก นี่ไม่ใช่สเตฟเฟน เคอร์รี่ นี่คือหมูพะโล้ชุบแป้งทอดที่วิ่งได้!',
    intensity: 5,
    is_active: true,
  },
  {
    slug: 'basketball_02',
    category: 'basketball',
    message:
      'กระโดดสองมือยังไม่พ้นพื้นเลย จะเอาแดงก์เหรอ? ลดพุงก่อนสัก 5 โล แรงโน้มถ่วงจะได้ให้อภัยบ้าง!',
    intensity: 4,
    is_active: true,
  },

  /* ---------------- 🏸 BADMINTON ---------------- */
  {
    slug: 'badminton_01',
    category: 'badminton',
    message:
      'ชาบูที่กินไป ต้องตีแบด 3 ชั่วโมง! และถ้าตีแป๊กเกิน 5 ครั้ง ระบบแนะนำให้เอาไม้แบดตีหัวตัวเองแทนลูกไก่ซะ!',
    intensity: 5,
    is_active: true,
  },
  {
    slug: 'badminton_02',
    category: 'badminton',
    message:
      'ยืนตีอยู่จุดเดียวเหมือนปักหมุด Google Maps! ขยับหน่อยพี่ ลูกขนไก่มันไม่ได้วิ่งมาหาพุงเองนะ!',
    intensity: 3,
    is_active: true,
  },

  /* ---------------- 🏃 RUNNING ---------------- */
  {
    slug: 'running_01',
    category: 'running',
    message:
      'กินหมูกรอบหรือสูบน้ำมันหมูเข้าไป? ไปวิ่งเพซ 6 ให้จบ 10 กิโล ถ้าน้อยกว่านี้ระบบถือว่าไปเดินเล่นคุยกับนกกับไม้ ไม่นับ!',
    intensity: 5,
    is_active: true,
  },
  {
    slug: 'running_02',
    category: 'running',
    message:
      'รองเท้าวิ่งราคาหมื่นห้า แต่พุงราคาล้าน! ออกไปเก็บระยะเดี๋ยวนี้ เดินสลับวิ่งไม่นับนะ ระบบจับโกงเป็น!',
    intensity: 4,
    is_active: true,
  },

  /* ---------------- 🐕 RUNNING FROM DOGS ---------------- */
  {
    slug: 'running_from_dogs_01',
    category: 'running_from_dogs',
    message:
      'ถ้ากีฬาปกติมันธรรมดาไป แนะนำให้ไปเดินเตะฝุ่นในซอยเปลี่ยวแล้ววิ่งหนีหมาหมู่สัก 30 นาที รับรองอะดรีนาลีนหลั่ง ไขมันกระจาย รอดก็ผอม ไม่รอดก็ฉีดยากันบาดทะยัก!',
    intensity: 5,
    is_active: true,
  },

  /* ---------------- 🚴 CYCLING ---------------- */
  {
    slug: 'cycling_01',
    category: 'cycling',
    message:
      'ยัดของหวานไปขนาดนี้ ไปปั่นจักรยาน 50 โล! ถ้าปั่นไม่ถึงแล้วแวะกินน้ำแข็งไสข้างทาง เตรียมตัวเปลี่ยนไปขี่ไซส์คิงคองได้เลย!',
    intensity: 5,
    is_active: true,
  },
  {
    slug: 'cycling_02',
    category: 'cycling',
    message:
      'เสือหมอบราคาแสน แต่คนขี่ทรงหมูหัน! ปั่นให้ครบระยะก่อนค่อยถ่ายรูปลงสตอรี่นะจ๊ะ อย่าปั่นแค่ถึงร้านกาแฟ!',
    intensity: 4,
    is_active: true,
  },

  /* ---------------- 🏊 SWIMMING ---------------- */
  {
    slug: 'swimming_01',
    category: 'swimming',
    message:
      'น้ำหนักจะจมสระอยู่แล้ว! ไปว่ายน้ำ 2 ชั่วโมง ห้ามเกาะขอบสระคุยกับเพื่อนเด็ดขาด ถ้าจมก็ถือว่าชดใช้กรรมที่ซัดหมูกรอบไปเมื่อวาน!',
    intensity: 5,
    is_active: true,
  },
  {
    slug: 'swimming_02',
    category: 'swimming',
    message:
      'ที่ลอยตัวได้ดีเนี่ย เพราะเทคนิคหรือเพราะไขมันช่วยพยุง? ไปตอบตัวเองตอนว่ายครบ 60 เที่ยวสระนะ!',
    intensity: 4,
    is_active: true,
  },

  /* ---------------- 💃 DANCING ---------------- */
  {
    slug: 'dancing_01',
    category: 'dancing',
    message:
      'กินแหลกแล้วจะมาเต้นเอาผ่าน? เต้นไปเลย 3 ชั่วโมงรวด เต้นให้ไขมันกระเพื่อมจนเพื่อนข้างๆ สะเทือน ถ้ายอมแพ้ก็กลับไปเต้นแอโรบิกหน้าโลตัสไป!',
    intensity: 5,
    is_active: true,
  },
  {
    slug: 'dancing_02',
    category: 'dancing',
    message:
      'ท่าเป๊ะ หน้าเป๊ะ แต่พุงเด้งไม่ตรงจังหวะ! เต้นต่ออีก 10 รอบเพลง ห้ามกดหยุดกลางคัน ไอดอลสายกิน!',
    intensity: 4,
    is_active: true,
  },

  /* ---------------- 🏋️ WEIGHT TRAINING ---------------- */
  {
    slug: 'weight_training_01',
    category: 'weight_training',
    message:
      'กินชาบูประหนึ่งพรุ่งนี้โลกแตก ไปเข็นเลื่อนลากเหล็ก 45 นาที ถ้าร้องขอชีวิตก่อนเวลา ไม่ต้องเสนอหน้ามาบอกใครว่าสายฟิต!',
    intensity: 5,
    is_active: true,
  },
  {
    slug: 'weight_training_02',
    category: 'weight_training',
    message:
      'ยกส้อมหนักกว่ายกดัมบ์เบลอีก! ไปสควอทให้ครบ 100 ที ก่อนคิดจะเปิดตู้เย็นรอบสอง เข้าใจตรงกันนะ!',
    intensity: 4,
    is_active: true,
  },

  {
    slug: 'weight_training_03',
    category: 'weight_training',
    message:
      'Hyrox ใช่ไหม? เตรียมใจไว้เลย แซนด์แบ็กที่นั่นเหม็นกว่าถุงเท้าที่ลืมไว้ในกระเป๋าสามอาทิตย์ แต่ก็ยังหอมกว่าข้ออ้างที่ใช้หนีซ้อมเมื่ออาทิตย์ที่แล้ว!',
    intensity: 5,
    is_active: true,
  },
  {
    slug: 'weight_training_04',
    category: 'weight_training',
    message:
      'กลิ่นแซนด์แบ็กติดเสื้อกลับบ้านสามวันไม่หาย — นั่นแหละหลักฐานชิ้นเดียวที่พิสูจน์ว่าไปมาจริง ไม่ได้แค่ไปถ่ายรูปหน้ายิม!',
    intensity: 4,
    is_active: true,
  },
  {
    slug: 'weight_training_05',
    category: 'weight_training',
    message:
      'ทุกคนที่เคยแบกแซนด์แบ็ก Hyrox จำกลิ่นนั้นได้หมดทั้งชีวิต ถ้าจำกลิ่นไม่ได้ แปลว่ายังไม่เคยไปจริง เลิกเคลมได้แล้ว!',
    intensity: 5,
    is_active: true,
  },

  /* ---------------- 🧗 ROCK CLIMBING ---------------- */
  {
    slug: 'rock_climbing_01',
    category: 'rock_climbing',
    message:
      'น้ำหนักขนาดนี้ เชือกสลิงร้องไห้แล้ว! ไปปีนผา 2 ชั่วโมง ถ้าตกลงมาไม่ต้องแปลกใจ แรงโน้มถ่วงมันยุติธรรมกับคนกินเยอะเสมอ!',
    intensity: 5,
    is_active: true,
  },

  /* ---------------- 🧘 YOGA / PILATES ---------------- */
  {
    slug: 'yoga_01',
    category: 'yoga',
    message:
      'กินเหมือนปล้นโรงฆ่าสัตว์ แต่ดันเลือกมาสายซอฟต์! ไปยืดเหยียด 3 ชั่วโมง ถ้ายกขาไม่ขึ้นเพราะติดพุง ก็ม้วนเสื่อกลับไปนอนซะ!',
    intensity: 5,
    is_active: true,
  },
  {
    slug: 'yoga_02',
    category: 'yoga',
    message:
      'ท่าศพนี่ทำได้ดีที่สุดในคลาสเลยนะ ตื่นได้แล้ว! ไปแพลงก์ต่ออีก 3 นาที ห้ามนับเร็ว ห้ามโกงลมหายใจ!',
    intensity: 4,
    is_active: true,
  },

  /* ---------------- ⛳ GOLF ---------------- */
  {
    slug: 'golf_01',
    category: 'golf',
    message:
      'กินหรูอยู่สบาย แคลก็เลยบานปลาย! ไปเดินตี 18 หลุม ห้ามใช้รถกอล์ฟ! ถ้าตีตกน้ำเกิน 3 ลูก ให้โดดลงไปงมลูกกอล์ฟเป็นการทำโทษ!',
    intensity: 5,
    is_active: true,
  },
  {
    slug: 'golf_02',
    category: 'golf',
    message:
      'วงสวิงสวยจริง แต่วงเอวสวยกว่า! เดินให้ครบ 18 หลุม แล้วห้ามสั่งเบียร์ที่คลับเฮาส์ด้วย ไม่งั้นเสียเที่ยว!',
    intensity: 4,
    is_active: true,
  },

  /* ---------------- 🛹 SURFSKATE ---------------- */
  {
    slug: 'surfskate_01',
    category: 'surfskate',
    message:
      'ทรงอย่างแบด หุ่นอย่างบวม! ไปไถสเก็ต 2 ชั่วโมง ถ้าล้มอย่าโทษบอร์ด โทษน้ำหนักตัวเองที่จุดศูนย์ถ่วงพัง!',
    intensity: 5,
    is_active: true,
  },

  /* ---------------- 🛏️ SEXUAL ACTIVITY ---------------- */
  {
    slug: 'sexual_activity_01',
    category: 'sexual_activity',
    message:
      'แคลอรี่ล้นขนาดนี้ ถ้าจะเบิร์นบนเตียงต้องทำต่อเนื่อง 6 ชั่วโมงครึ่ง... สภาพ! แค่ 3 นาทีก็หอบเป็นหมาแล้ว เลิกเพ้อเจ้อแล้วไปใส่รองเท้าวิ่งเดี๋ยวนี้!',
    intensity: 5,
    is_active: true,
  },

  /* ---------------- 🚌 STANDING ON BUS ---------------- */
  {
    slug: 'standing_on_bus_01',
    category: 'standing_on_bus',
    message:
      'ขี้เกียจออกกำลังกายนักใช่ไหม? งั้นไปยืนโหนรถเมล์ตอนรถติดๆ สัก 2 ชั่วโมงครึ่ง รับรองไขมันสั่นยิกๆ!',
    intensity: 4,
    is_active: true,
  },

  /* ---------------- 🧹 HOUSEWORK ---------------- */
  {
    slug: 'housework_01',
    category: 'housework',
    message:
      'ไปซักผ้า ถูบ้าน ล้างห้องน้ำ 3 ชั่วโมง ถือว่าชดใช้กรรมที่แอบไปซัดของหวานมาเมื่อคืน ลุกไปทำเดี๋ยวนี้!',
    intensity: 4,
    is_active: true,
  },

  /* ---------------- 🛍️ SHOPPING ---------------- */
  {
    slug: 'shopping_01',
    category: 'shopping',
    message:
      'ถ้าชีวิตนี้ขาดการเดินห้างไม่ได้ ก็ไปเดินให้ทั่วจตุจักรตอนเที่ยงตรงสัก 4 ชั่วโมง ห้ามแวะกินน้ำหวาน ห้ามแวะตากแอร์ กินเข้าไปเยอะก็ต้องสู้แดดหน่อย!',
    intensity: 5,
    is_active: true,
  },
  {
    slug: 'shopping_02',
    category: 'shopping',
    message:
      'ถือถุงช้อปปิ้ง 2 โลแล้วนับเป็นเวทเทรนนิ่งเหรอ? งั้นถือต่ออีก 4 ชั่วโมง ห้ามนั่งพักฟู้ดคอร์ท ห้ามสั่งชานมไข่มุก!',
    intensity: 4,
    is_active: true,
  },

  /* ---------------- 🎤 KARAOKE ---------------- */
  {
    slug: 'karaoke_01',
    category: 'karaoke',
    message:
      'ถ้าขี้เกียจขยับตัวนัก ก็ไปแหกปากร้องคาราโอเกะเพลงร็อก 5 ชั่วโมงรวด ถ้าร้องจนคอแตกแล้วแคลยังไม่หมด ก็ยอมรับสภาพความอ้วนซะ!',
    intensity: 5,
    is_active: true,
  },
  {
    slug: 'karaoke_02',
    category: 'karaoke',
    message:
      'เสียงดีนะ แต่หุ่นแย่มาก! ร้องยืนให้ครบ 20 เพลงร็อกโดยไม่นั่งพัก ถ้าแหบก่อนถือว่าแพ้ กลับบ้านไปกินสลัด!',
    intensity: 4,
    is_active: true,
  },

  /* ---------------- 💔 ARGUING WITH PARTNER ---------------- */
  {
    slug: 'arguing_with_partner_01',
    category: 'arguing_with_partner',
    message:
      'กินเยอะจนสมองตื้อ งั้นไปหาเรื่องเถียงกับแฟนให้เลือดสูบฉีดสัก 3 ชั่วโมง เผลอๆ โดนไล่ออกจากบ้าน ได้เดินหาที่นอนใหม่ เบิร์นแคลได้อีก... สองเด้ง!',
    intensity: 5,
    is_active: true,
  },
  {
    slug: 'arguing_with_partner_02',
    category: 'arguing_with_partner',
    message:
      'เถียงเก่งขนาดนี้ เอาพลังไปเถียงกับตาชั่งบ้างสิ! เดี๋ยวมันก็ตอบกลับมาด้วยตัวเลข 3 หลักให้ช้ำใจเอง',
    intensity: 4,
    is_active: true,
  },

  /* ---------------- 📱 SCROLLING PHONE ---------------- */
  {
    slug: 'scrolling_phone_01',
    category: 'scrolling_phone',
    message:
      'ที่พิมพ์อยู่นี่พุงค้ำจอหรือยัง? พลังงานที่กินเข้าไปวันนี้ ต่อให้นอนไถฟีดจนนิ้วล็อกก็เบิร์นไม่หมด ลุกไปขยับตัวสิวะ!',
    intensity: 5,
    is_active: true,
  },
  {
    slug: 'scrolling_phone_02',
    category: 'scrolling_phone',
    message:
      'เลื่อนฟีดจนแบตหมด 2 รอบ แต่จะลุกไปเติมน้ำยังขี้เกียจ! นิ้วกลายเป็นส่วนที่ฟิตที่สุดในร่างกายไปแล้ว ส่วนที่เหลือพังหมด ลุกเดี๋ยวนี้!',
    intensity: 4,
    is_active: true,
  },

  /* ---------------- 🚨 WALL OF SHAME (คนหนีการฝึก) ---------------- */
  {
    slug: 'wall_of_shame_01',
    category: 'wall_of_shame',
    message:
      'ประกาศจับ! หายหัวไป 3 วันหลังจากยัดบุฟเฟต์ไป 2,000 แคล ป่านนี้น้ำหนักคงทะลุ 100 โลไปแล้ว ใครเจอตัวฝากเตะก้นส่งไปสนามบอลที!',
    intensity: 5,
    is_active: true,
  },
  {
    slug: 'wall_of_shame_02',
    category: 'wall_of_shame',
    message:
      'หนีการฝึกไป 1 อาทิตย์เต็ม แต่สตอรี่ลงหมูกระทะทุกคืน! ระบบเห็นหมดนะเพื่อน ขึ้นบอร์ดประจานเรียบร้อย ไม่ต้องมาอ้างว่างานยุ่ง',
    intensity: 5,
    is_active: true,
  },
  {
    slug: 'wall_of_shame_03',
    category: 'wall_of_shame',
    message:
      'อ้างว่าฝนตกเลยไม่ได้ไปวิ่ง... แล้วฝนตกทำไมปากไม่หยุดล่ะ? กลับมาซ้อมเดี๋ยวนี้ ก่อนที่ตาชั่งจะฟ้องแฟนให้!',
    intensity: 5,
    is_active: true,
  },
]

/* ==========================================================================
 * 4) SUPABASE CLIENT
 * ======================================================================== */

function createAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      '❌ ไม่พบ ENV: ต้องตั้งค่า SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ในไฟล์ .env\n' +
        '   (ห้ามใช้ anon key เพราะติด RLS จะ insert ไม่ผ่าน)',
    )
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/* ==========================================================================
 * 5) HELPERS — Bulk Insert / Validation
 * ======================================================================== */

/** แบ่ง array เป็นก้อนย่อย เพื่อกัน payload ใหญ่เกินไป */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Bulk upsert แบบแบ่ง chunk — รันซ้ำได้โดยไม่เกิดข้อมูลซ้ำ (idempotent)
 * @returns จำนวนแถวที่เขียนสำเร็จ
 */
async function bulkUpsert<T extends object>(
  db: SupabaseClient,
  table: string,
  rows: T[],
  onConflict: string,
  chunkSize = 100,
): Promise<number> {
  let total = 0

  for (const [index, batch] of chunk(rows, chunkSize).entries()) {
    const { data, error } = await db
      .from(table)
      // cast ที่ขอบ: SupabaseClient ไม่ได้ผูก Database generic ไว้
      // จึงยัด generic T เข้า type ของ upsert() ตรงๆ ไม่ได้
      .upsert(batch as never[], { onConflict, ignoreDuplicates: false })
      .select('id')

    if (error) {
      throw new Error(`❌ upsert "${table}" batch #${index + 1} ล้มเหลว: ${error.message}`)
    }

    total += data?.length ?? 0
    console.log(`   ├─ batch #${index + 1}: ${data?.length ?? 0} rows`)
  }

  return total
}

/** ตรวจความถูกต้องของข้อมูลก่อนยิงเข้า DB (กันพิมพ์ผิด / ข้อมูลกำพร้า) */
function validateSeedData(): void {
  const errors: string[] = []

  const activitySlugs = new Set<string>()
  for (const a of ACTIVITIES) {
    if (activitySlugs.has(a.slug)) errors.push(`activity slug ซ้ำ: ${a.slug}`)
    activitySlugs.add(a.slug)
    if (a.mets <= 0) errors.push(`METs ต้องมากกว่า 0: ${a.slug}`)
  }

  const roastSlugs = new Set<string>()
  const ORPHAN_ALLOWED = new Set(['wall_of_shame'])

  for (const r of ROASTS) {
    if (roastSlugs.has(r.slug)) errors.push(`roast slug ซ้ำ: ${r.slug}`)
    roastSlugs.add(r.slug)

    if (!activitySlugs.has(r.category) && !ORPHAN_ALLOWED.has(r.category)) {
      errors.push(`roast "${r.slug}" อ้างถึง category "${r.category}" ที่ไม่มีใน activities`)
    }
  }

  // เตือน (ไม่ใช่ error) ถ้ากิจกรรมไหนยังไม่มีคำจิกกัด
  const roastedCategories = new Set(ROASTS.map((r) => r.category))
  for (const slug of activitySlugs) {
    if (!roastedCategories.has(slug)) {
      console.warn(`⚠️  activity "${slug}" ยังไม่มี roast — ผู้ใช้จะไม่โดนด่า`)
    }
  }

  if (errors.length) {
    throw new Error(`❌ Seed data ไม่ผ่านการตรวจสอบ:\n   - ${errors.join('\n   - ')}`)
  }
}

/** ล้างข้อมูลเดิม (ใช้กับ flag --fresh เท่านั้น) */
async function truncateTables(db: SupabaseClient): Promise<void> {
  console.log('🧨 --fresh: กำลังลบข้อมูลเดิมใน roasts และ activities ...')

  // ลบ roasts ก่อน เผื่ออนาคตมี FK ผูกกับ activities
  for (const table of ['roasts', 'activities']) {
    const { error } = await db.from(table).delete().neq('slug', '__never_match__')
    if (error) throw new Error(`❌ ลบข้อมูลตาราง "${table}" ล้มเหลว: ${error.message}`)
  }
}

/* ==========================================================================
 * 6) MAIN
 * ======================================================================== */

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const isFresh = args.includes('--fresh')
  const isDryRun = args.includes('--dry-run')

  console.log('🔥 Seeding: "ลดน้ำหนักไม่มีคำว่าปลอบใจ"')
  console.log(`   activities: ${ACTIVITIES.length} รายการ | roasts: ${ROASTS.length} รายการ\n`)

  validateSeedData()
  console.log('✅ ตรวจสอบข้อมูลผ่านทั้งหมด\n')

  if (isDryRun) {
    console.table(
      ACTIVITIES.map((a) => ({ slug: a.slug, name: a.name_th, mets: a.mets, group: a.group_key })),
    )
    console.log('\n🧪 --dry-run: ไม่ได้เขียนข้อมูลลงฐานข้อมูล')
    return
  }

  const db = createAdminClient()
  if (isFresh) await truncateTables(db)

  console.log('📥 Insert activities ...')
  const activityCount = await bulkUpsert(db, 'activities', ACTIVITIES, 'slug')
  console.log(`   └─ รวม ${activityCount} rows\n`)

  console.log('📥 Insert roasts ...')
  const roastCount = await bulkUpsert(db, 'roasts', ROASTS, 'slug')
  console.log(`   └─ รวม ${roastCount} rows\n`)

  console.log('🎉 Seed เสร็จเรียบร้อย — ไปออกกำลังกายได้แล้ว ไม่ต้องรออะไร!')
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
