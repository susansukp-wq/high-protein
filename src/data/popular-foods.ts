/**
 * popular-foods.ts — ฐานข้อมูลอาหารไทย + ตัวเลือกเสริม (พิเศษ / ไข่ดาว / ข้าวเพิ่ม ฯลฯ)
 *
 * ใช้ 2 ที่:
 *  1. Autocomplete + auto-fill แคลอรี่ใน Step 1 (ฝั่ง client, ไม่ต้อง query DB)
 *  2. ตารางอ้างอิงในหน้า Programmatic SEO (/burn/[slug])
 *
 * hard-code ไว้ในโค้ดเพราะเป็นข้อมูลอ้างอิงที่แทบไม่เปลี่ยน และ Googlebot
 * ต้องเห็นทันทีใน HTML โดยไม่ต้องรอ user กรอกอะไร
 *
 * ตัวเลขแคลอรี่เป็นค่าประมาณต่อ 1 หน่วยเสิร์ฟทั่วไปตามร้านในไทย
 */

export type FoodCategory =
  | 'rice_dish' // ข้าวราดแกง / จานเดียว
  | 'noodle' // เส้น / ก๋วยเตี๋ยว
  | 'isan' // อีสาน / ส้มตำ / ปิ้งย่างอีสาน
  | 'buffet' // บุฟเฟต์ / ปิ้งย่าง / ชาบู
  | 'grill' // ปิ้งย่างริมทาง
  | 'fried' // ของทอด / สตรีทฟู้ด
  | 'soup' // ต้ม / แกงถ้วย
  | 'seafood' // อาหารทะเล
  | 'asian' // ญี่ปุ่น / เกาหลี / จีน
  | 'fastfood' // ฟาสต์ฟู้ด
  | 'breakfast' // อาหารเช้า / เบเกอรี่
  | 'thai_dessert' // ขนมไทย
  | 'dessert' // ขนมหวานสากล / คาเฟ่
  | 'drink' // เครื่องดื่ม
  | 'alcohol' // เหล้าเบียร์
  | 'snack' // ขนมซอง / ของกินเล่น
  | 'fruit' // ผลไม้
  | 'clean' // อาหารคลีน
  | 'convenience' // ร้านสะดวกซื้อ

export const FOOD_CATEGORY_LABEL: Record<FoodCategory, string> = {
  rice_dish: 'ข้าวจานเดียว',
  noodle: 'เส้น / ก๋วยเตี๋ยว',
  isan: 'อีสาน / ส้มตำ',
  buffet: 'บุฟเฟต์ / ปิ้งย่าง',
  grill: 'ปิ้งย่างริมทาง',
  fried: 'ของทอด / สตรีทฟู้ด',
  soup: 'ต้ม / แกง',
  seafood: 'อาหารทะเล',
  asian: 'ญี่ปุ่น / เกาหลี',
  fastfood: 'ฟาสต์ฟู้ด',
  breakfast: 'อาหารเช้า / เบเกอรี่',
  thai_dessert: 'ขนมไทย',
  dessert: 'ขนมหวาน / คาเฟ่',
  drink: 'เครื่องดื่ม',
  alcohol: 'เหล้า / เบียร์',
  snack: 'ขนมซอง / ของกินเล่น',
  fruit: 'ผลไม้',
  clean: 'อาหารคลีน',
  convenience: 'ร้านสะดวกซื้อ',
}

/**
 * คำอธิบายรายหมวด — ใช้ในหน้า /food/[slug] เพื่อให้เนื้อหาแต่ละหน้าไม่ซ้ำกันหมด
 * เมนูในหมวดเดียวกันใช้ข้อความเดียวกัน แต่ต่างหมวดจะได้เนื้อหาคนละชุด
 */
export const FOOD_CATEGORY_NOTE: Record<FoodCategory, string> = {
  rice_dish:
    'ข้าวจานเดียวคือกับดักที่คนไทยเจอบ่อยที่สุด เพราะข้าวสวยหนึ่งจานให้พลังงานราว 240 แคลอรี่ก่อนจะนับกับข้าวด้วยซ้ำ เมนูผัดที่ใช้น้ำมันเยอะอย่างกะเพราหรือข้าวผัดจึงพุ่งไปได้ถึง 600 แคลอรี่ง่ายๆ ถ้าสั่งพิเศษเพิ่มอีก 35% ก็เกือบเท่าสองมื้อรวมกัน',
  noodle:
    'ก๋วยเตี๋ยวน้ำเป็นหนึ่งในเมนูที่คุ้มที่สุดสำหรับคนคุมน้ำหนัก เพราะน้ำซุปทำให้อิ่มโดยไม่เพิ่มแคลอรี่มาก แต่พอเปลี่ยนเป็นแบบผัดหรือราดหน้าที่ต้องใช้น้ำมัน ตัวเลขจะกระโดดขึ้นเกือบสองเท่าทันที เส้นใหญ่ดูดน้ำมันมากกว่าเส้นเล็กด้วย',
  isan:
    'อาหารอีสานเป็นหมวดที่คนคุมน้ำหนักได้เปรียบที่สุด เพราะส่วนใหญ่เป็นการต้ม ย่าง และตำ ไม่ผ่านน้ำมัน ตัวแปรจริงอยู่ที่ข้าวเหนียวที่กินคู่ ซึ่งหนึ่งห่อให้พลังงานราว 200 แคลอรี่ และน้ำตาลในน้ำปรุงของส้มตำที่มักถูกมองข้าม',
  buffet:
    'บุฟเฟต์เป็นหมวดที่ตัวเลขคาดเดายากที่สุดเพราะขึ้นกับว่ากินไปกี่รอบ ค่าที่แสดงคือค่าเฉลี่ยของคนกินปกติต่อหนึ่งมื้อ ปัญหาไม่ได้อยู่ที่เนื้อสัตว์แต่อยู่ที่น้ำจิ้ม น้ำอัดลมรีฟิล และมันหมูที่ละลายอยู่บนกระทะตลอดเวลา',
  grill:
    'ปิ้งย่างริมทางดูเหมือนกินน้อยเพราะเป็นไม้เล็กๆ แต่แคลอรี่ต่อไม้สูงกว่าที่คิดเพราะเนื้อที่ใช้มักเป็นส่วนติดมัน และเกือบทุกคนกินคู่กับข้าวเหนียวซึ่งเพิ่มอีกเกือบเท่าตัว',
  fried:
    'ของทอดมีปัญหาสองชั้นคือพลังงานจากน้ำมันที่ดูดเข้าไป และการที่มันอิ่มช้าจนกินเกินโดยไม่รู้ตัว น้ำมันหนึ่งช้อนโต๊ะให้พลังงานราว 120 แคลอรี่ ซึ่งมากกว่าข้าวสวยครึ่งจาน',
  soup:
    'แกงและต้มแบ่งได้เป็นสองกลุ่มชัดเจน กลุ่มน้ำใสอย่างต้มยำน้ำใสหรือแกงส้มอยู่ในเกณฑ์ที่ดีมาก ส่วนกลุ่มที่ใส่กะทิหรือน้ำข้นจะสูงขึ้นเกือบสามเท่าจากไขมันในกะทิเพียงอย่างเดียว',
  seafood:
    'อาหารทะเลเป็นแหล่งโปรตีนที่ให้พลังงานต่ำที่สุดต่อกรัมเมื่อเทียบกับเนื้อชนิดอื่น ตัวแปรทั้งหมดอยู่ที่วิธีปรุง กุ้งเผาหรือปลานึ่งอยู่ในเกณฑ์ดีมาก แต่พอเปลี่ยนเป็นผัดผงกะหรี่หรือทอดราดน้ำปลา ตัวเลขจะเพิ่มขึ้นสองถึงสามเท่า',
  asian:
    'อาหารญี่ปุ่นและเกาหลีมักถูกเข้าใจว่าเป็นอาหารสุขภาพ ซึ่งจริงเฉพาะเมนูที่ไม่ผ่านการทอด ซูชิและซาชิมิอยู่ในเกณฑ์ดี แต่ทงคัตสึ ราเมนน้ำข้น และไก่ทอดเกาหลีอยู่ในระดับเดียวกับฟาสต์ฟู้ดตะวันตก',
  fastfood:
    'ฟาสต์ฟู้ดออกแบบมาให้พลังงานสูงต่อคำ เพราะรวมแป้ง ไขมัน และน้ำตาลไว้ในมื้อเดียว ปัญหาหลักคือชุดเซ็ตที่พ่วงเฟรนช์ฟรายส์กับน้ำอัดลม ซึ่งเพิ่มพลังงานอีกเกือบเท่าตัวจากตัวเบอร์เกอร์เอง',
  breakfast:
    'อาหารเช้าและเบเกอรี่เป็นหมวดที่คนประเมินต่ำที่สุด ครัวซองต์หนึ่งชิ้นใช้เนยปริมาณมากในการทำชั้นแป้ง ส่วนขนมปังปิ้งเนยนมที่ดูเป็นของว่างเล็กๆ ให้พลังงานพอๆ กับข้าวราดแกงหนึ่งจาน',
  thai_dessert:
    'ขนมไทยส่วนใหญ่มีส่วนประกอบหลักสามอย่างคือแป้ง น้ำตาล และกะทิ ซึ่งเป็นชุดที่ให้พลังงานสูงมากต่อคำ ข้อดีคือหน่วยเสิร์ฟมักเล็ก ถ้าควบคุมปริมาณได้ก็ยังพอบริหารจัดการได้',
  dessert:
    'ของหวานสไตล์คาเฟ่มักถูกออกแบบมาให้แชร์กัน แต่ในทางปฏิบัติคนส่วนใหญ่กินคนเดียวจนหมด ตัวเลขที่แสดงคือหน่วยเสิร์ฟตามปกติ ถ้ากินคนเดียวทั้งถ้วยให้คูณตามจำนวนที่ระบุในหน่วยเสิร์ฟ',
  drink:
    'เครื่องดื่มเป็นหมวดที่อันตรายที่สุดเพราะไม่ทำให้อิ่ม สมองไม่นับพลังงานจากของเหลวเข้าไปในความรู้สึกอิ่มเหมือนอาหารแข็ง ชานมไข่มุกหนึ่งแก้วจึงเท่ากับข้าวหนึ่งจานครึ่งโดยที่คุณยังหิวเท่าเดิม',
  alcohol:
    'แอลกอฮอล์ให้พลังงาน 7 แคลอรี่ต่อกรัม ซึ่งมากกว่าน้ำตาลและโปรตีนที่ให้ 4 แคลอรี่ ที่แย่กว่านั้นคือร่างกายจัดลำดับให้เผาผลาญแอลกอฮอล์ก่อนเสมอ ทำให้ไขมันจากกับแกล้มถูกพักไว้เป็นไขมันสะสมแทน',
  snack:
    'ขนมซองมีปัญหาเรื่องการกินแบบไม่รู้ตัวมากที่สุด เพราะกินไปทำอย่างอื่นไปจนหมดถุงโดยไม่ทันสังเกต วิธีที่ได้ผลคือแบ่งใส่ถ้วยตามปริมาณที่ตั้งใจจะกิน แล้วเก็บถุงให้พ้นสายตา',
  fruit:
    'ผลไม้ให้พลังงานจากน้ำตาลธรรมชาติพร้อมใยอาหารและวิตามิน จึงต่างจากน้ำตาลในขนมอย่างชัดเจน แต่ผลไม้ไทยหลายชนิดหวานจัดกว่าที่คิด โดยเฉพาะทุเรียนที่ให้พลังงานสูงกว่าผลไม้ทั่วไปหลายเท่าเพราะมีไขมันด้วย',
  convenience:
    'ของกินในร้านสะดวกซื้อมีข้อได้เปรียบที่อาหารร้านทั่วไปไม่มี คือมีฉลากโภชนาการบอกตัวเลขจริงติดอยู่ที่ซอง ไม่ต้องเดาเหมือนข้าวราดแกงที่แต่ละร้านใส่น้ำมันไม่เท่ากัน ข้อเสียคือของพวกนี้ออกแบบมาให้หยิบง่ายและกินระหว่างทาง ทำให้กลายเป็นมื้อที่สี่ของวันโดยไม่ได้แทนอะไรเลย จุดที่ควรระวังที่สุดคือเครื่องดื่มกับของว่างที่หยิบพ่วงมาตอนจ่ายเงิน ซึ่งมักรวมกันได้เกิน 400 แคลอรี่โดยที่ไม่รู้สึกว่ากินอะไร',
  clean:
    'อาหารคลีนไม่ได้แปลว่ากินได้ไม่จำกัด กฎการลดน้ำหนักยังคงเป็นเรื่องของพลังงานรวมที่เข้ากับที่ออกเสมอ ข้อได้เปรียบจริงของหมวดนี้คือโปรตีนสูงและใยอาหารมาก ทำให้อิ่มนานกว่าที่พลังงานเท่ากัน',
}

export interface FoodItem {
  slug: string
  name: string
  kcal: number
  /** หน่วยเสิร์ฟ เช่น "1 จาน", "1 มื้อบุฟเฟต์" */
  serving: string
  emoji: string
  category: FoodCategory
  /** คำค้นอื่นที่คนไทยพิมพ์หาเมนูนี้ — ใช้กับ autocomplete */
  aliases?: string[]
}

/* ==========================================================================
 * ADD-ONS — "พิเศษ" และของเพิ่มที่คนไทยสั่งกันจริง
 * ------------------------------------------------------------------------
 * multiplier = คูณกับแคลอรี่ของเมนูหลัก (เช่น พิเศษ = เนื้อ/เส้นเพิ่ม ~35%)
 * kcal       = บวกเพิ่มแบบคงที่ (เช่น ไข่ดาว 1 ฟอง)
 * ======================================================================== */

export interface FoodAddon {
  slug: string
  label: string
  emoji: string
  /** บวกเพิ่มแบบคงที่ (kcal) — ติดลบได้ เช่น "ไม่กินข้าว" */
  kcal?: number
  /** คูณกับแคลอรี่เมนูหลัก */
  multiplier?: number
  /** คำที่ผู้ใช้อาจพิมพ์ติดมากับชื่อเมนู เช่น "ข้าวกะเพราพิเศษ" */
  keywords?: string[]
  /** คำอธิบายสั้นๆ บน UI */
  hint: string
  /**
   * ตัวเลือกที่เลือกได้ทีละอย่างในกลุ่มเดียวกัน
   * เช่นชนิดเส้น — เลือกเส้นใหญ่แล้วต้องยกเลิกวุ้นเส้นอัตโนมัติ
   * ถ้าไม่กำหนดกลุ่ม จะติ๊กพร้อมกันได้อิสระ
   */
  exclusiveGroup?: string
  appliesTo: FoodCategory[]
}

/** ป้ายหัวข้อของกลุ่มตัวเลือกที่เลือกได้ทีละอย่าง */
export const ADDON_GROUP_LABEL: Record<string, string> = {
  'noodle-type': 'เปลี่ยนชนิดเส้น',
}

export const FOOD_ADDONS: FoodAddon[] = [
  /* ---- ชนิดเส้น: ทุกเมนูคิดจากเส้นเล็กเป็นค่าตั้งต้น ---- */
  {
    slug: 'noodle_yai',
    label: 'เส้นใหญ่',
    emoji: '🍜',
    kcal: 40,
    keywords: ['เส้นใหญ่'],
    hint: '+40 kcal',
    exclusiveGroup: 'noodle-type',
    appliesTo: ['noodle'],
  },
  {
    slug: 'noodle_mee',
    label: 'เส้นหมี่',
    emoji: '🍜',
    kcal: -10,
    keywords: ['เส้นหมี่', 'หมี่ขาว'],
    hint: '−10 kcal',
    exclusiveGroup: 'noodle-type',
    appliesTo: ['noodle'],
  },
  {
    slug: 'noodle_bamee',
    label: 'บะหมี่',
    emoji: '🍜',
    kcal: 60,
    keywords: ['บะหมี่', 'เส้นบะหมี่'],
    hint: '+60 kcal (เส้นไข่)',
    exclusiveGroup: 'noodle-type',
    appliesTo: ['noodle'],
  },
  {
    slug: 'noodle_woonsen',
    label: 'วุ้นเส้น',
    emoji: '🍥',
    kcal: -50,
    keywords: ['วุ้นเส้น'],
    hint: '−50 kcal',
    exclusiveGroup: 'noodle-type',
    appliesTo: ['noodle'],
  },
  {
    slug: 'noodle_none',
    label: 'ไม่เอาเส้น (เกาเหลา)',
    emoji: '🥣',
    kcal: -150,
    keywords: ['เกาเหลา', 'ไม่เอาเส้น', 'ไม่ใส่เส้น'],
    hint: '−150 kcal',
    exclusiveGroup: 'noodle-type',
    appliesTo: ['noodle'],
  },
  {
    slug: 'noodle_extra',
    label: 'เพิ่มเส้น',
    emoji: '➕',
    kcal: 150,
    keywords: ['เพิ่มเส้น', 'เส้นเพิ่ม'],
    hint: '+150 kcal',
    appliesTo: ['noodle'],
  },

  {
    slug: 'special',
    label: 'พิเศษ',
    emoji: '💥',
    multiplier: 1.35,
    keywords: ['พิเศษ', 'special'],
    hint: '+35% (เนื้อ/เส้นเพิ่ม)',
    appliesTo: ['rice_dish', 'noodle', 'isan', 'fried', 'soup', 'asian'],
  },
  {
    slug: 'egg_fried',
    label: 'ไข่ดาว',
    emoji: '🍳',
    kcal: 90,
    keywords: ['ไข่ดาว', 'เพิ่มไข่ดาว'],
    hint: '+90 kcal',
    appliesTo: ['rice_dish', 'noodle', 'isan', 'breakfast', 'asian'],
  },
  {
    slug: 'omelette',
    label: 'ไข่เจียว',
    emoji: '🥚',
    kcal: 160,
    keywords: ['ไข่เจียว'],
    hint: '+160 kcal',
    appliesTo: ['rice_dish', 'noodle', 'soup'],
  },
  {
    slug: 'extra_rice',
    label: 'ข้าวเพิ่ม',
    emoji: '🍚',
    kcal: 220,
    keywords: ['ข้าวเพิ่ม', 'เพิ่มข้าว'],
    hint: '+220 kcal (1 จาน)',
    appliesTo: ['rice_dish', 'isan', 'soup', 'seafood', 'asian'],
  },
  {
    slug: 'sticky_rice',
    label: 'ข้าวเหนียวเพิ่ม',
    emoji: '🍙',
    kcal: 200,
    keywords: ['ข้าวเหนียวเพิ่ม', 'เพิ่มข้าวเหนียว'],
    hint: '+200 kcal (1 ห่อ)',
    appliesTo: ['isan', 'grill', 'fried'],
  },
  {
    slug: 'cheese',
    label: 'ชีสเยิ้ม',
    emoji: '🧀',
    kcal: 120,
    keywords: ['ชีสเพิ่ม', 'เพิ่มชีส', 'ชีสเยิ้ม'],
    hint: '+120 kcal',
    appliesTo: ['rice_dish', 'noodle', 'fried', 'fastfood', 'asian'],
  },
  {
    slug: 'boba',
    label: 'ท็อปปิ้งเพิ่ม',
    emoji: '🧋',
    kcal: 80,
    keywords: ['ไข่มุกเพิ่ม', 'เพิ่มไข่มุก', 'ท็อปปิ้งเพิ่ม'],
    hint: '+80 kcal (ไข่มุก/บุก)',
    appliesTo: ['drink'],
  },
  {
    slug: 'whipped',
    label: 'วิปครีม',
    emoji: '🍦',
    kcal: 100,
    keywords: ['วิปครีม', 'เพิ่มวิป'],
    hint: '+100 kcal',
    appliesTo: ['drink', 'dessert'],
  },
  {
    slug: 'less_sweet',
    label: 'หวานน้อย',
    emoji: '🌿',
    multiplier: 0.7,
    keywords: ['หวานน้อย', 'ไม่หวาน', 'หวาน50'],
    hint: '−30% (หวาน 50%)',
    appliesTo: ['drink', 'dessert', 'thai_dessert'],
  },
  {
    slug: 'no_rice',
    label: 'ไม่กินข้าว',
    emoji: '🚫',
    kcal: -220,
    keywords: ['ไม่กินข้าว', 'ไม่เอาข้าว', 'ไม่รับข้าว'],
    hint: '−220 kcal (กินแต่กับ)',
    appliesTo: ['rice_dish'],
  },
]

/* ==========================================================================
 * FOOD DATABASE
 * ======================================================================== */

export const POPULAR_FOODS: FoodItem[] = [
  /* ---------------- ข้าวจานเดียว ---------------- */
  { slug: 'khao-suay', name: 'ข้าวสวย', kcal: 240, serving: '1 จาน', emoji: '🍚', category: 'rice_dish', aliases: ['ข้าวเปล่า'] },
  { slug: 'kaphrao-moo', name: 'ข้าวกะเพราหมูสับ', kcal: 550, serving: '1 จาน', emoji: '🌿', category: 'rice_dish', aliases: ['กะเพรา', 'กระเพรา', 'ข้าวกะเพรา', 'ข้าวกระเพรา', 'กระเพราหมูสับ', 'kaphrao'] },
  { slug: 'kaphrao-kai-dao', name: 'ข้าวกะเพราหมูสับ + ไข่ดาว', kcal: 640, serving: '1 จาน', emoji: '🍳', category: 'rice_dish', aliases: ['กะเพราไข่ดาว', 'กระเพราไข่ดาว'] },
  { slug: 'kaphrao-kai-krob', name: 'ข้าวกะเพราไก่กรอบ', kcal: 700, serving: '1 จาน', emoji: '🍗', category: 'rice_dish', aliases: ['กะเพราไก่กรอบ'] },
  { slug: 'kaphrao-talay', name: 'ข้าวกะเพราทะเล', kcal: 560, serving: '1 จาน', emoji: '🦐', category: 'rice_dish', aliases: ['กะเพราทะเล'] },
  { slug: 'khao-pad', name: 'ข้าวผัด', kcal: 550, serving: '1 จาน', emoji: '🍚', category: 'rice_dish', aliases: ['ข้าวผัดหมู', 'fried rice'] },
  { slug: 'khao-pad-kung', name: 'ข้าวผัดกุ้ง', kcal: 580, serving: '1 จาน', emoji: '🍤', category: 'rice_dish' },
  { slug: 'khao-pad-american', name: 'ข้าวผัดอเมริกัน', kcal: 950, serving: '1 จาน', emoji: '🍗', category: 'rice_dish', aliases: ['อเมริกันฟรายด์ไรซ์'] },
  { slug: 'khao-pad-kimchi', name: 'ข้าวผัดกิมจิ', kcal: 550, serving: '1 จาน', emoji: '🌶️', category: 'rice_dish' },
  { slug: 'khao-man-kai', name: 'ข้าวมันไก่', kcal: 600, serving: '1 จาน', emoji: '🍗', category: 'rice_dish', aliases: ['khao man kai'] },
  { slug: 'khao-man-kai-tod', name: 'ข้าวมันไก่ทอด', kcal: 780, serving: '1 จาน', emoji: '🍗', category: 'rice_dish' },
  { slug: 'khao-moo-daeng', name: 'ข้าวหมูแดง', kcal: 550, serving: '1 จาน', emoji: '🥩', category: 'rice_dish', aliases: ['หมูแดง'] },
  { slug: 'moo-krob', name: 'ข้าวหมูกรอบ', kcal: 600, serving: '1 จาน', emoji: '🥓', category: 'rice_dish', aliases: ['หมูกรอบ'] },
  { slug: 'khao-kha-moo', name: 'ข้าวขาหมู', kcal: 700, serving: '1 จาน', emoji: '🍛', category: 'rice_dish', aliases: ['ขาหมู'] },
  { slug: 'khao-kluk-kapi', name: 'ข้าวคลุกกะปิ', kcal: 620, serving: '1 จาน', emoji: '🍤', category: 'rice_dish' },
  { slug: 'khao-mok-kai', name: 'ข้าวหมกไก่', kcal: 650, serving: '1 จาน', emoji: '🍛', category: 'rice_dish' },
  { slug: 'khao-kai-jeaw', name: 'ข้าวไข่เจียว', kcal: 600, serving: '1 จาน', emoji: '🍳', category: 'rice_dish', aliases: ['ไข่เจียวหมูสับ'] },
  { slug: 'khao-kai-kon', name: 'ข้าวไข่ข้น', kcal: 550, serving: '1 จาน', emoji: '🍳', category: 'rice_dish' },
  { slug: 'khao-na-ped', name: 'ข้าวหน้าเป็ด', kcal: 620, serving: '1 จาน', emoji: '🦆', category: 'rice_dish', aliases: ['เป็ดย่าง'] },
  { slug: 'green-curry', name: 'ข้าวแกงเขียวหวานไก่', kcal: 600, serving: '1 จาน', emoji: '🍛', category: 'rice_dish', aliases: ['แกงเขียวหวาน'] },
  { slug: 'massaman', name: 'ข้าวแกงมัสมั่นไก่', kcal: 680, serving: '1 จาน', emoji: '🍛', category: 'rice_dish', aliases: ['มัสมั่น'] },
  { slug: 'panang', name: 'ข้าวพะแนงหมู', kcal: 640, serving: '1 จาน', emoji: '🍛', category: 'rice_dish', aliases: ['พะแนง'] },
  { slug: 'khao-moo-tod', name: 'ข้าวหมูทอดกระเทียม', kcal: 700, serving: '1 จาน', emoji: '🧄', category: 'rice_dish' },
  { slug: 'khao-kai-tod-hatyai', name: 'ข้าวไก่ทอดหาดใหญ่', kcal: 750, serving: '1 จาน', emoji: '🍗', category: 'rice_dish', aliases: ['ไก่ทอดหาดใหญ่'] },
  { slug: 'khao-yum', name: 'ข้าวยำปักษ์ใต้', kcal: 350, serving: '1 จาน', emoji: '🥗', category: 'rice_dish' },
  { slug: 'khao-tom-moo', name: 'ข้าวต้มหมู', kcal: 300, serving: '1 ชาม', emoji: '🥣', category: 'rice_dish', aliases: ['ข้าวต้ม'] },
  { slug: 'jok', name: 'โจ๊กหมู + ไข่', kcal: 320, serving: '1 ถ้วย', emoji: '🥣', category: 'rice_dish', aliases: ['โจ๊ก'] },
  { slug: 'katsu-curry', name: 'ข้าวแกงกะหรี่หมูทอด', kcal: 900, serving: '1 จาน', emoji: '🍛', category: 'asian', aliases: ['คัตสึเคอร์รี่', 'แกงกะหรี่ญี่ปุ่น'] },
  { slug: 'gyudon', name: 'ข้าวหน้าเนื้อ (กิวด้ง)', kcal: 700, serving: '1 ชาม', emoji: '🥩', category: 'asian', aliases: ['กิวด้ง', 'ข้าวหน้าเนื้อ'] },
  { slug: 'salmon-don', name: 'ข้าวหน้าแซลมอน', kcal: 700, serving: '1 ชาม', emoji: '🍣', category: 'asian', aliases: ['แซลมอนดง', 'ซาชิมิดง'] },
  { slug: 'teriyaki-don', name: 'ข้าวหน้าไก่เทอริยากิ', kcal: 650, serving: '1 ชาม', emoji: '🍗', category: 'asian' },

  /* ---------------- เส้น / ก๋วยเตี๋ยว ---------------- */
  { slug: 'kuay-teow-nam', name: 'ก๋วยเตี๋ยวน้ำใส', kcal: 350, serving: '1 ชาม', emoji: '🍜', category: 'noodle', aliases: ['ก๋วยเตี๋ยว', 'เกาเหลา'] },
  { slug: 'kuay-teow-tom-yum', name: 'ก๋วยเตี๋ยวต้มยำแห้ง', kcal: 480, serving: '1 ชาม', emoji: '🌶️', category: 'noodle', aliases: ['ต้มยำแห้ง'] },
  { slug: 'yentafo', name: 'เย็นตาโฟ', kcal: 400, serving: '1 ชาม', emoji: '🍜', category: 'noodle' },
  { slug: 'boat-noodle', name: 'ก๋วยเตี๋ยวเรือ', kcal: 320, serving: '1 ชาม', emoji: '🚤', category: 'noodle', aliases: ['เรือ'] },
  { slug: 'ba-mee-moo-daeng', name: 'บะหมี่หมูแดง', kcal: 460, serving: '1 ชาม', emoji: '🍜', category: 'noodle', aliases: ['บะหมี่'] },
  { slug: 'ba-mee-kiew', name: 'บะหมี่เกี๊ยวกุ้ง', kcal: 420, serving: '1 ชาม', emoji: '🥟', category: 'noodle', aliases: ['เกี๊ยวกุ้ง'] },
  { slug: 'rad-na', name: 'ราดหน้าหมู', kcal: 640, serving: '1 จาน', emoji: '🍝', category: 'noodle', aliases: ['ราดหน้า'] },
  { slug: 'pad-see-ew', name: 'ผัดซีอิ๊ว', kcal: 640, serving: '1 จาน', emoji: '🍝', category: 'noodle' },
  { slug: 'pad-kee-mao', name: 'ผัดขี้เมา', kcal: 620, serving: '1 จาน', emoji: '🌶️', category: 'noodle' },
  { slug: 'pad-thai', name: 'ผัดไทยกุ้งสด', kcal: 600, serving: '1 จาน', emoji: '🍤', category: 'noodle', aliases: ['ผัดไทย', 'pad thai'] },
  { slug: 'hoy-tod', name: 'หอยทอด', kcal: 700, serving: '1 จาน', emoji: '🦪', category: 'noodle', aliases: ['ออส่วน'] },
  { slug: 'kanom-jeen', name: 'ขนมจีนน้ำยา', kcal: 420, serving: '1 จาน', emoji: '🍜', category: 'noodle', aliases: ['ขนมจีน'] },
  { slug: 'khao-soi', name: 'ข้าวซอยไก่', kcal: 700, serving: '1 ชาม', emoji: '🍜', category: 'noodle', aliases: ['ข้าวซอย', 'khao soi'] },
  { slug: 'kuay-jap', name: 'ก๋วยจั๊บน้ำข้น', kcal: 480, serving: '1 ชาม', emoji: '🍜', category: 'noodle', aliases: ['ก๋วยจั๊บ'] },
  { slug: 'suki-haeng', name: 'สุกี้แห้ง', kcal: 550, serving: '1 จาน', emoji: '🍲', category: 'noodle', aliases: ['สุกี้'] },
  { slug: 'mee-korat', name: 'ผัดหมี่โคราช', kcal: 550, serving: '1 จาน', emoji: '🍝', category: 'noodle' },
  { slug: 'mama-tomyum', name: 'มาม่าต้มยำ + ไข่', kcal: 450, serving: '1 ชาม', emoji: '🍜', category: 'noodle', aliases: ['มาม่า', 'บะหมี่กึ่งสำเร็จรูป', 'ไวไว'] },
  { slug: 'carbonara', name: 'สปาเกตตี้คาโบนาร่า', kcal: 800, serving: '1 จาน', emoji: '🍝', category: 'noodle', aliases: ['คาโบนาร่า', 'พาสต้า', 'สปาเกตตี้'] },
  { slug: 'ramen', name: 'ราเมนทงคตสึ', kcal: 700, serving: '1 ชาม', emoji: '🍜', category: 'asian', aliases: ['ราเมง', 'ramen'] },
  { slug: 'udon', name: 'อุด้ง', kcal: 450, serving: '1 ชาม', emoji: '🍜', category: 'asian' },

  /* ---------------- 🍜 ก๋วยเตี๋ยว: สายตุ๋น ---------------- */
  { slug: 'kuay-teow-nuea-tun', name: 'ก๋วยเตี๋ยวเนื้อตุ๋น', kcal: 420, serving: '1 ชาม', emoji: '🍜', category: 'noodle', aliases: ['เนื้อตุ๋น', 'ก๋วยเตี๋ยวเนื้อ', 'เนื้อเปื่อย'] },
  { slug: 'kuay-teow-moo-tun', name: 'ก๋วยเตี๋ยวหมูตุ๋น', kcal: 400, serving: '1 ชาม', emoji: '🍜', category: 'noodle', aliases: ['หมูตุ๋น'] },
  { slug: 'kuay-teow-kai-tun', name: 'ก๋วยเตี๋ยวไก่ตุ๋น', kcal: 380, serving: '1 ชาม', emoji: '🍜', category: 'noodle', aliases: ['ไก่ตุ๋น', 'ก๋วยเตี๋ยวไก่'] },
  { slug: 'kuay-teow-ped', name: 'ก๋วยเตี๋ยวเป็ดพะโล้', kcal: 480, serving: '1 ชาม', emoji: '🦆', category: 'noodle', aliases: ['ก๋วยเตี๋ยวเป็ด', 'เป็ดตุ๋น', 'เป็ดพะโล้'] },

  /* ---------------- 🍜 ก๋วยเตี๋ยว: เนื้อสด / ลูกชิ้น ---------------- */
  { slug: 'kuay-teow-nuea-sod', name: 'ก๋วยเตี๋ยวเนื้อสด', kcal: 380, serving: '1 ชาม', emoji: '🥩', category: 'noodle', aliases: ['เนื้อสด'] },
  { slug: 'kuay-teow-nam-tok', name: 'ก๋วยเตี๋ยวน้ำตก', kcal: 400, serving: '1 ชาม', emoji: '🍲', category: 'noodle', aliases: ['น้ำตกหมู', 'ก๋วยเตี๋ยวน้ำตกหมู'] },
  { slug: 'kuay-teow-look-chin-pla', name: 'ก๋วยเตี๋ยวลูกชิ้นปลา', kcal: 330, serving: '1 ชาม', emoji: '🐟', category: 'noodle', aliases: ['ลูกชิ้นปลา'] },
  { slug: 'kuay-teow-look-chin-nuea', name: 'ก๋วยเตี๋ยวลูกชิ้นเนื้อ', kcal: 360, serving: '1 ชาม', emoji: '🍡', category: 'noodle', aliases: ['ลูกชิ้นเนื้อ'] },
  { slug: 'kuay-teow-pla', name: 'ก๋วยเตี๋ยวปลา', kcal: 340, serving: '1 ชาม', emoji: '🐟', category: 'noodle', aliases: ['ก๋วยเตี๋ยวปลาสด'] },
  { slug: 'kuay-teow-kung', name: 'ก๋วยเตี๋ยวกุ้ง', kcal: 360, serving: '1 ชาม', emoji: '🍤', category: 'noodle' },
  { slug: 'kuay-teow-moo-sap', name: 'ก๋วยเตี๋ยวหมูสับ', kcal: 350, serving: '1 ชาม', emoji: '🍜', category: 'noodle', aliases: ['หมูสับ'] },
  { slug: 'kuay-teow-kai-chik', name: 'ก๋วยเตี๋ยวไก่ฉีก', kcal: 330, serving: '1 ชาม', emoji: '🍗', category: 'noodle', aliases: ['ไก่ฉีก'] },
  { slug: 'kuay-teow-kai-mara', name: 'ก๋วยเตี๋ยวไก่มะระ', kcal: 320, serving: '1 ชาม', emoji: '🥒', category: 'noodle', aliases: ['ไก่มะระ', 'มะระยัดไส้'] },
  { slug: 'kuay-teow-moo-manao', name: 'ก๋วยเตี๋ยวหมูมะนาว', kcal: 340, serving: '1 ชาม', emoji: '🍋', category: 'noodle', aliases: ['หมูมะนาว'] },

  /* ---------------- 🍜 ก๋วยเตี๋ยว: น้ำข้น / รสจัด ---------------- */
  { slug: 'kuay-teow-tom-yum-nam-khon', name: 'ก๋วยเตี๋ยวต้มยำน้ำข้น', kcal: 520, serving: '1 ชาม', emoji: '🌶️', category: 'noodle', aliases: ['ต้มยำน้ำข้น', 'ก๋วยเตี๋ยวต้มยำ'] },
  { slug: 'yentafo-haeng', name: 'เย็นตาโฟแห้ง', kcal: 450, serving: '1 จาน', emoji: '🌸', category: 'noodle', aliases: ['เย็นตาโฟแห้ง'] },
  { slug: 'kuay-jap-yuan', name: 'ก๋วยจั๊บญวน', kcal: 420, serving: '1 ชาม', emoji: '🍜', category: 'noodle', aliases: ['ก๋วยจั๊บญวน'] },
  { slug: 'kao-lao', name: 'เกาเหลา (ไม่ใส่เส้น)', kcal: 200, serving: '1 ชาม', emoji: '🥣', category: 'noodle', aliases: ['เกาเหลา', 'ไม่เอาเส้น'] },

  /* ---------------- 🍜 บะหมี่ ---------------- */
  { slug: 'ba-mee-ped', name: 'บะหมี่เป็ด', kcal: 500, serving: '1 ชาม', emoji: '🦆', category: 'noodle', aliases: ['บะหมี่เป็ดย่าง'] },
  { slug: 'ba-mee-tom-yum', name: 'บะหมี่ต้มยำ', kcal: 480, serving: '1 ชาม', emoji: '🌶️', category: 'noodle' },
  { slug: 'ba-mee-moo-krob', name: 'บะหมี่หมูกรอบ', kcal: 550, serving: '1 ชาม', emoji: '🥓', category: 'noodle', aliases: ['บะหมี่หมูกรอบ'] },
  { slug: 'ba-mee-haeng', name: 'บะหมี่แห้งเกี๊ยว', kcal: 480, serving: '1 จาน', emoji: '🥟', category: 'noodle', aliases: ['บะหมี่แห้ง'] },

  /* ---------------- 🍜 เส้นผัด / เส้นทอด ---------------- */
  { slug: 'kuay-teow-kua-kai', name: 'ก๋วยเตี๋ยวคั่วไก่', kcal: 600, serving: '1 จาน', emoji: '🍳', category: 'noodle', aliases: ['คั่วไก่'] },
  { slug: 'mee-krob', name: 'หมี่กรอบ', kcal: 550, serving: '1 จาน', emoji: '🍜', category: 'noodle' },
  { slug: 'rad-na-talay', name: 'ราดหน้าทะเล', kcal: 600, serving: '1 จาน', emoji: '🦐', category: 'noodle', aliases: ['ราดหน้าทะเล'] },
  { slug: 'kuay-teow-lui-suan', name: 'ก๋วยเตี๋ยวลุยสวน', kcal: 220, serving: '5 ม้วน', emoji: '🥬', category: 'noodle', aliases: ['ลุยสวน'] },
  { slug: 'kuay-teow-lord', name: 'ก๋วยเตี๋ยวหลอด', kcal: 380, serving: '1 จาน', emoji: '🥠', category: 'noodle' },

  /* ---------------- 🍜 ขนมจีน / สุกี้ ---------------- */
  { slug: 'kanom-jeen-nam-ngiao', name: 'ขนมจีนน้ำเงี้ยว', kcal: 400, serving: '1 จาน', emoji: '🍜', category: 'noodle', aliases: ['น้ำเงี้ยว'] },
  { slug: 'kanom-jeen-green-curry', name: 'ขนมจีนแกงเขียวหวาน', kcal: 550, serving: '1 จาน', emoji: '🍛', category: 'noodle' },
  { slug: 'kanom-jeen-sao-nam', name: 'ขนมจีนซาวน้ำ', kcal: 380, serving: '1 จาน', emoji: '🥥', category: 'noodle', aliases: ['ซาวน้ำ'] },
  { slug: 'suki-nam', name: 'สุกี้น้ำ', kcal: 400, serving: '1 ชาม', emoji: '🍲', category: 'noodle' },

  /* ---------------- อีสาน / ส้มตำ ---------------- */
  { slug: 'som-tam', name: 'ส้มตำไทย', kcal: 180, serving: '1 จาน', emoji: '🥗', category: 'isan', aliases: ['ส้มตำ', 'ตำไทย', 'som tam'] },
  { slug: 'som-tam-pu-pla-ra', name: 'ส้มตำปูปลาร้า', kcal: 200, serving: '1 จาน', emoji: '🦀', category: 'isan', aliases: ['ตำปูปลาร้า'] },
  { slug: 'tam-sua', name: 'ตำซั่ว', kcal: 250, serving: '1 จาน', emoji: '🌶️', category: 'isan' },
  { slug: 'larb-moo', name: 'ลาบหมู', kcal: 280, serving: '1 จาน', emoji: '🌶️', category: 'isan', aliases: ['ลาบ'] },
  { slug: 'nam-tok', name: 'น้ำตกหมู', kcal: 300, serving: '1 จาน', emoji: '🥩', category: 'isan', aliases: ['น้ำตก'] },
  { slug: 'kor-moo-yang', name: 'คอหมูย่าง', kcal: 450, serving: '1 จาน', emoji: '🥩', category: 'isan', aliases: ['คอหมู'] },
  { slug: 'kai-yang', name: 'ไก่ย่าง', kcal: 500, serving: 'ครึ่งตัว', emoji: '🍗', category: 'isan' },
  { slug: 'tom-saep', name: 'ต้มแซ่บกระดูกอ่อน', kcal: 350, serving: '1 หม้อเล็ก', emoji: '🍲', category: 'isan', aliases: ['ต้มแซ่บ'] },
  { slug: 'sai-krok-isan', name: 'ไส้กรอกอีสาน', kcal: 400, serving: '3 ไม้', emoji: '🌭', category: 'isan', aliases: ['ไส้กรอก'] },
  { slug: 'moo-yor', name: 'หมูยอ', kcal: 200, serving: '5 ชิ้น', emoji: '🥩', category: 'isan' },

  /* ---------------- บุฟเฟต์ / ปิ้งย่าง ---------------- */
  { slug: 'moo-krata', name: 'หมูกระทะ', kcal: 1800, serving: '1 มื้อบุฟเฟต์', emoji: '🍖', category: 'buffet', aliases: ['ปิ้งย่าง', 'หมูกะทะ', 'moo krata'] },
  { slug: 'shabu-buffet', name: 'ชาบูบุฟเฟต์', kcal: 1600, serving: '1 มื้อบุฟเฟต์', emoji: '🍲', category: 'buffet', aliases: ['ชาบู', 'shabu', 'หม้อไฟ'] },
  { slug: 'suki-buffet', name: 'สุกี้บุฟเฟต์', kcal: 1200, serving: '1 มื้อบุฟเฟต์', emoji: '🍲', category: 'buffet', aliases: ['สุกี้ตี๋น้อย'] },
  { slug: 'yakiniku', name: 'ยากินิกุ', kcal: 1500, serving: '1 มื้อบุฟเฟต์', emoji: '🥩', category: 'buffet', aliases: ['ปิ้งย่างญี่ปุ่น', 'yakiniku', 'เนื้อย่าง'] },
  { slug: 'korean-bbq', name: 'ปิ้งย่างเกาหลี', kcal: 1400, serving: '1 มื้อบุฟเฟต์', emoji: '🥓', category: 'buffet', aliases: ['หมูสามชั้นย่าง', 'ซัมกยอบซัล'] },
  { slug: 'seafood-buffet', name: 'บุฟเฟต์ซีฟู้ด', kcal: 1400, serving: '1 มื้อ', emoji: '🦞', category: 'buffet', aliases: ['ซีฟู้ด', 'seafood'] },
  { slug: 'hotel-buffet', name: 'บุฟเฟต์โรงแรม', kcal: 2500, serving: '1 มื้อ', emoji: '🏨', category: 'buffet', aliases: ['บุฟเฟ่ต์โรงแรม', 'ไฮเทลอฟเตอร์นูนที'] },
  { slug: 'mala', name: 'หมาล่าสายพาน', kcal: 1300, serving: '1 มื้อ', emoji: '🌶️', category: 'buffet', aliases: ['หมาล่า', 'mala'] },
  { slug: 'jim-jum', name: 'จิ้มจุ่ม', kcal: 700, serving: '1 หม้อ', emoji: '🍲', category: 'buffet' },
  { slug: 'pizza-buffet', name: 'พิซซ่าถาดใหญ่', kcal: 2100, serving: '1 ถาด', emoji: '🍕', category: 'fastfood', aliases: ['พิซซ่าถาด'] },

  /* ---------------- ปิ้งย่างริมทาง / ของทอด ---------------- */
  { slug: 'moo-ping', name: 'หมูปิ้ง + ข้าวเหนียว', kcal: 420, serving: '3 ไม้ + ข้าวเหนียว', emoji: '🍢', category: 'grill', aliases: ['หมูปิ้ง', 'ข้าวเหนียวหมูปิ้ง'] },
  { slug: 'look-chin-ping', name: 'ลูกชิ้นปิ้ง', kcal: 250, serving: '5 ไม้', emoji: '🍡', category: 'grill', aliases: ['ลูกชิ้น'] },
  { slug: 'fried-chicken', name: 'ไก่ทอด', kcal: 800, serving: '3 ชิ้น', emoji: '🍗', category: 'fried', aliases: ['ไก่ทอดเคเอฟซี', 'kfc'] },
  { slug: 'korean-fried-chicken', name: 'ไก่ทอดเกาหลี', kcal: 900, serving: '1 กล่อง', emoji: '🍗', category: 'fried', aliases: ['ไก่เกาหลี'] },
  { slug: 'chicken-wings', name: 'ปีกไก่ทอด', kcal: 500, serving: '4 ชิ้น', emoji: '🍗', category: 'fried', aliases: ['ปีกไก่'] },
  { slug: 'nugget', name: 'นักเก็ตไก่', kcal: 280, serving: '6 ชิ้น', emoji: '🍗', category: 'fried', aliases: ['นักเก็ต'] },
  { slug: 'kai-pop', name: 'ไก่ป๊อป', kcal: 350, serving: '1 ถ้วย', emoji: '🍗', category: 'fried' },
  { slug: 'en-kai-tod', name: 'เอ็นไก่ทอด', kcal: 400, serving: '1 ถ้วย', emoji: '🍗', category: 'fried' },
  { slug: 'french-fries', name: 'เฟรนช์ฟรายส์', kcal: 340, serving: '1 ถุงกลาง', emoji: '🍟', category: 'fried', aliases: ['มันฝรั่งทอด', 'เฟรนฟราย', 'fries'] },
  { slug: 'look-chin-tod', name: 'ลูกชิ้นทอด', kcal: 400, serving: '10 ลูก', emoji: '🍢', category: 'fried' },
  { slug: 'sai-krok-tod', name: 'ไส้กรอกทอด', kcal: 350, serving: '5 ชิ้น', emoji: '🌭', category: 'fried' },
  { slug: 'gyoza', name: 'เกี๊ยวซ่าทอด', kcal: 380, serving: '6 ชิ้น', emoji: '🥟', category: 'fried', aliases: ['เกี๊ยวซ่า', 'gyoza'] },
  { slug: 'popia-tod', name: 'ปอเปี๊ยะทอด', kcal: 300, serving: '5 ชิ้น', emoji: '🥟', category: 'fried', aliases: ['ปอเปี๊ยะ', 'ปอเปียะทอด', 'เปาะเปี๊ยะทอด'] },
  { slug: 'pa-tong-go', name: 'ปาท่องโก๋', kcal: 320, serving: '4 ตัว', emoji: '🥖', category: 'fried' },
  { slug: 'kluay-kaek', name: 'กล้วยแขก', kcal: 350, serving: '1 ถุง', emoji: '🍌', category: 'fried', aliases: ['กล้วยทอด'] },
  { slug: 'corn-butter', name: 'ข้าวโพดคลุกเนย', kcal: 300, serving: '1 ถ้วย', emoji: '🌽', category: 'fried', aliases: ['ข้าวโพด'] },

  /* ---------------- ต้ม / แกง / ทะเล ---------------- */
  { slug: 'tom-yum-kung', name: 'ต้มยำกุ้งน้ำข้น', kcal: 400, serving: '1 ถ้วย', emoji: '🍲', category: 'soup', aliases: ['ต้มยำ', 'tom yum'] },
  { slug: 'tom-kha-kai', name: 'ต้มข่าไก่', kcal: 380, serving: '1 ถ้วย', emoji: '🥥', category: 'soup', aliases: ['ต้มข่า'] },
  { slug: 'gaeng-som', name: 'แกงส้ม', kcal: 180, serving: '1 ถ้วย', emoji: '🍲', category: 'soup' },
  { slug: 'kung-pao', name: 'กุ้งเผา', kcal: 200, serving: '5 ตัว', emoji: '🦐', category: 'seafood', aliases: ['กุ้ง'] },
  { slug: 'pu-pad-pong', name: 'ปูผัดผงกะหรี่', kcal: 700, serving: '1 จาน', emoji: '🦀', category: 'seafood', aliases: ['ปูผัดผงกะหรี่'] },
  { slug: 'hoy-malaeng-poo', name: 'หอยแมลงภู่อบ', kcal: 300, serving: '1 จาน', emoji: '🦪', category: 'seafood', aliases: ['หอยอบ'] },
  { slug: 'pla-muek-yang', name: 'ปลาหมึกย่าง', kcal: 250, serving: '1 จาน', emoji: '🦑', category: 'seafood', aliases: ['ปลาหมึก'] },
  { slug: 'pla-nueng-manao', name: 'ปลานึ่งมะนาว', kcal: 400, serving: '1 ตัว', emoji: '🐟', category: 'seafood', aliases: ['ปลานึ่ง'] },
  { slug: 'pla-tod-nampla', name: 'ปลากะพงทอดน้ำปลา', kcal: 650, serving: '1 ตัว', emoji: '🐟', category: 'seafood', aliases: ['ปลาทอด', 'ปลากระพงทอดน้ำปลา', 'ปลากระพงทอด'] },
  { slug: 'kung-ob-woonsen', name: 'กุ้งอบวุ้นเส้น', kcal: 600, serving: '1 จาน', emoji: '🦐', category: 'seafood' },

  /* ---------------- ญี่ปุ่น / เกาหลี ---------------- */
  { slug: 'sushi', name: 'ซูชิ', kcal: 500, serving: '10 คำ', emoji: '🍣', category: 'asian', aliases: ['sushi', 'ซูชิสายพาน'] },
  { slug: 'tonkatsu', name: 'ทงคัตสึ', kcal: 850, serving: '1 ชุด', emoji: '🍖', category: 'asian', aliases: ['หมูทอดญี่ปุ่น'] },
  { slug: 'takoyaki', name: 'ทาโกยากิ', kcal: 400, serving: '6 ลูก', emoji: '🐙', category: 'asian', aliases: ['ทาโกะยากิ'] },
  { slug: 'tteokbokki', name: 'ต๊อกโบกี', kcal: 500, serving: '1 จาน', emoji: '🌶️', category: 'asian', aliases: ['ต็อกโบกี', 'ตอกบกกี'] },
  { slug: 'kimbap', name: 'คิมบับ', kcal: 350, serving: '1 ม้วน', emoji: '🍙', category: 'asian' },
  { slug: 'dim-sum', name: 'ติ่มซำ', kcal: 450, serving: '5 เข่ง', emoji: '🥟', category: 'asian', aliases: ['ติ่มซำ', 'ขนมจีบ', 'ซาลาเปา'] },

  /* ---------------- ฟาสต์ฟู้ด ---------------- */
  { slug: 'burger-set', name: 'เบอร์เกอร์ชุด + เฟรนช์ฟรายส์', kcal: 1100, serving: '1 ชุด', emoji: '🍔', category: 'fastfood', aliases: ['เบอร์เกอร์', 'burger', 'แมคโดนัลด์', 'แมค'] },
  { slug: 'big-mac', name: 'บิ๊กแมค', kcal: 550, serving: '1 ชิ้น', emoji: '🍔', category: 'fastfood', aliases: ['big mac'] },
  { slug: 'pizza', name: 'พิซซ่า', kcal: 570, serving: '2 ชิ้น', emoji: '🍕', category: 'fastfood', aliases: ['pizza'] },
  { slug: 'subway', name: 'แซนด์วิชซับเวย์ 12 นิ้ว', kcal: 700, serving: '1 ชิ้น', emoji: '🥪', category: 'fastfood', aliases: ['ซับเวย์', 'subway'] },
  { slug: 'hotdog', name: 'ฮอทดอก', kcal: 350, serving: '1 ชิ้น', emoji: '🌭', category: 'fastfood', aliases: ['ฮอตดอก'] },
  { slug: 'taco', name: 'ทาโก้', kcal: 450, serving: '2 ชิ้น', emoji: '🌮', category: 'fastfood' },

  /* ---------------- อาหารเช้า / เบเกอรี่ ---------------- */
  { slug: 'croissant', name: 'ครัวซองต์เนย', kcal: 330, serving: '1 ชิ้น', emoji: '🥐', category: 'breakfast', aliases: ['ครัวซอง', 'croissant'] },
  { slug: 'croissant-salted-egg', name: 'ครัวซองต์ไส้ไข่เค็ม', kcal: 480, serving: '1 ชิ้น', emoji: '🥐', category: 'breakfast', aliases: ['ครัวซองไข่เค็ม'] },
  { slug: 'toast-butter', name: 'ขนมปังปิ้งเนยนม', kcal: 400, serving: '1 แผ่นหนา', emoji: '🍞', category: 'breakfast', aliases: ['ขนมปังปิ้ง', 'ขนมปังสังขยา'] },
  { slug: 'sandwich-ham', name: 'แซนด์วิชแฮมชีส', kcal: 350, serving: '1 ชิ้น', emoji: '🥪', category: 'breakfast', aliases: ['แซนด์วิช', 'แซนวิช', 'แซนวิชแฮมชีส', 'แซนด์วิชแฮม'] },
  { slug: 'kai-krata', name: 'ไข่กระทะ', kcal: 450, serving: '1 กระทะ', emoji: '🍳', category: 'breakfast', aliases: ['ไข่กระทะ', 'ไข่กะทะ', 'ไข่กระทะเวียดนาม'] },
  { slug: 'nam-tao-hu', name: 'ปาท่องโก๋ + น้ำเต้าหู้', kcal: 400, serving: '1 ชุด', emoji: '🥛', category: 'breakfast', aliases: ['น้ำเต้าหู้'] },
  { slug: 'pancake', name: 'แพนเค้ก', kcal: 520, serving: '3 ชิ้น', emoji: '🥞', category: 'breakfast', aliases: ['แพนเค้ก'] },
  { slug: 'roti', name: 'โรตีกล้วยไข่ราดนม', kcal: 600, serving: '1 ชิ้น', emoji: '🥞', category: 'breakfast', aliases: ['โรตี', 'roti'] },

  /* ---------------- ขนมไทย ---------------- */
  { slug: 'mango-sticky-rice', name: 'ข้าวเหนียวมะม่วง', kcal: 550, serving: '1 จาน', emoji: '🥭', category: 'thai_dessert', aliases: ['ข้าวเหนียวมูน', 'mango sticky rice'] },
  { slug: 'bua-loy', name: 'บัวลอยไข่หวาน', kcal: 350, serving: '1 ถ้วย', emoji: '🍡', category: 'thai_dessert', aliases: ['บัวลอย'] },
  { slug: 'tub-tim-krob', name: 'ทับทิมกรอบ', kcal: 320, serving: '1 ถ้วย', emoji: '🍧', category: 'thai_dessert' },
  { slug: 'lod-chong', name: 'ลอดช่องน้ำกะทิ', kcal: 300, serving: '1 ถ้วย', emoji: '🍮', category: 'thai_dessert', aliases: ['ลอดช่อง'] },
  { slug: 'khanom-krok', name: 'ขนมครก', kcal: 280, serving: '5 คู่', emoji: '🍮', category: 'thai_dessert' },
  { slug: 'thong-yod', name: 'ทองหยิบ ทองหยอด ฝอยทอง', kcal: 350, serving: '1 ชุด', emoji: '🍯', category: 'thai_dessert', aliases: ['ฝอยทอง', 'ทองหยอด', 'ขนมไทย'] },
  { slug: 'kluay-buat-chi', name: 'กล้วยบวชชี', kcal: 300, serving: '1 ถ้วย', emoji: '🍌', category: 'thai_dessert' },
  { slug: 'khanom-mo-kaeng', name: 'ขนมหม้อแกง', kcal: 320, serving: '1 ชิ้น', emoji: '🍮', category: 'thai_dessert' },
  { slug: 'sangkaya', name: 'ข้าวเหนียวสังขยา', kcal: 450, serving: '1 จาน', emoji: '🍮', category: 'thai_dessert', aliases: ['สังขยา'] },
  { slug: 'ice-cream-kati', name: 'ไอติมกะทิ', kcal: 250, serving: '1 ถ้วย', emoji: '🍨', category: 'thai_dessert', aliases: ['ไอติมกะทิ'] },
  { slug: 'roti-sai-mai', name: 'โรตีสายไหม', kcal: 300, serving: '5 ชิ้น', emoji: '🍬', category: 'thai_dessert' },

  /* ---------------- ขนมหวาน / คาเฟ่ ---------------- */
  { slug: 'bingsu', name: 'บิงซู', kcal: 650, serving: '1 ถ้วย', emoji: '🍧', category: 'dessert', aliases: ['น้ำแข็งไส', 'bingsu'] },
  { slug: 'cake', name: 'เค้กช็อกโกแลต', kcal: 450, serving: '1 ชิ้น', emoji: '🍰', category: 'dessert', aliases: ['เค้ก', 'cake'] },
  { slug: 'cheesecake', name: 'ชีสเค้ก', kcal: 400, serving: '1 ชิ้น', emoji: '🍰', category: 'dessert', aliases: ['ชีสเค้ก'] },
  { slug: 'brownie', name: 'บราวนี่', kcal: 400, serving: '1 ชิ้น', emoji: '🍫', category: 'dessert', aliases: ['บราวนี'] },
  { slug: 'donut', name: 'โดนัทเคลือบน้ำตาล', kcal: 500, serving: '2 ชิ้น', emoji: '🍩', category: 'dessert', aliases: ['โดนัท', 'donut'] },
  { slug: 'ice-cream', name: 'ไอศกรีม', kcal: 300, serving: '2 สกู๊ป', emoji: '🍦', category: 'dessert', aliases: ['ไอติม', 'ice cream'] },
  { slug: 'waffle', name: 'วาฟเฟิล', kcal: 450, serving: '1 ชิ้น', emoji: '🧇', category: 'dessert' },
  { slug: 'lava-cake', name: 'ช็อกโกแลตลาวา', kcal: 500, serving: '1 ชิ้น', emoji: '🍫', category: 'dessert', aliases: ['ลาวาเค้ก'] },
  { slug: 'macaron', name: 'มาการอง', kcal: 250, serving: '3 ชิ้น', emoji: '🍬', category: 'dessert' },
  { slug: 'choux', name: 'ชูครีม', kcal: 300, serving: '2 ชิ้น', emoji: '🧁', category: 'dessert' },

  /* ---------------- เครื่องดื่ม ---------------- */
  { slug: 'bubble-tea', name: 'ชานมไข่มุก', kcal: 400, serving: '1 แก้ว (หวาน 100%)', emoji: '🧋', category: 'drink', aliases: ['ชานม', 'ไข่มุก', 'bubble tea', 'boba'] },
  { slug: 'thai-tea', name: 'ชาไทยเย็น', kcal: 300, serving: '1 แก้ว', emoji: '🥤', category: 'drink', aliases: ['ชาเย็น', 'ชาไทย'] },
  { slug: 'green-tea-latte', name: 'ชาเขียวนมเย็น', kcal: 320, serving: '1 แก้ว', emoji: '🍵', category: 'drink', aliases: ['ชาเขียว', 'มัทฉะ'] },
  { slug: 'coffee-iced', name: 'กาแฟเย็น', kcal: 250, serving: '1 แก้ว', emoji: '☕', category: 'drink', aliases: ['กาแฟ', 'โอเลี้ยงยกล้อ'] },
  { slug: 'latte', name: 'ลาเต้เย็น', kcal: 200, serving: '1 แก้ว', emoji: '☕', category: 'drink', aliases: ['ลาเต้', 'latte'] },
  { slug: 'frappe', name: 'กาแฟปั่นวิปครีม', kcal: 380, serving: '1 แก้ว', emoji: '🥤', category: 'drink', aliases: ['ฟราปเป้', 'frappe', 'ปั่น'] },
  { slug: 'americano', name: 'อเมริกาโน่ไม่ใส่น้ำตาล', kcal: 10, serving: '1 แก้ว', emoji: '☕', category: 'drink', aliases: ['อเมริกาโน่', 'americano'] },
  { slug: 'cocoa', name: 'โกโก้เย็น', kcal: 350, serving: '1 แก้ว', emoji: '🍫', category: 'drink', aliases: ['โกโก้'] },
  { slug: 'milk-pink', name: 'นมเย็น', kcal: 300, serving: '1 แก้ว', emoji: '🥛', category: 'drink', aliases: ['นมชมพู'] },
  { slug: 'oliang', name: 'โอเลี้ยง', kcal: 150, serving: '1 แก้ว', emoji: '🥤', category: 'drink' },
  { slug: 'soft-drink', name: 'น้ำอัดลม', kcal: 140, serving: '1 กระป๋อง', emoji: '🥤', category: 'drink', aliases: ['โค้ก', 'เป๊ปซี่', 'น้ำหวาน', 'coke'] },
  { slug: 'red-soda', name: 'น้ำแดงโซดา', kcal: 180, serving: '1 แก้ว', emoji: '🥤', category: 'drink', aliases: ['น้ำแดง'] },
  { slug: 'orange-juice', name: 'น้ำส้มคั้น', kcal: 110, serving: '1 แก้ว', emoji: '🍊', category: 'drink', aliases: ['น้ำผลไม้', 'juice'] },
  { slug: 'smoothie', name: 'สมูทตี้ผลไม้', kcal: 250, serving: '1 แก้ว', emoji: '🥤', category: 'drink', aliases: ['สมูทตี้'] },
  { slug: 'soy-milk', name: 'นมถั่วเหลือง', kcal: 130, serving: '1 ขวด', emoji: '🥛', category: 'drink', aliases: ['นมถั่ว'] },
  { slug: 'coconut-water', name: 'น้ำมะพร้าว', kcal: 90, serving: '1 ลูก', emoji: '🥥', category: 'drink', aliases: ['มะพร้าว'] },
  { slug: 'cha-manao', name: 'ชามะนาว', kcal: 130, serving: '1 แก้ว', emoji: '🍋', category: 'drink' },

  /* ---------------- เหล้า / เบียร์ ---------------- */
  { slug: 'beer', name: 'เบียร์', kcal: 450, serving: '3 กระป๋อง', emoji: '🍺', category: 'alcohol', aliases: ['เบียร์สด', 'beer'] },
  { slug: 'beer-big', name: 'เบียร์ขวดใหญ่', kcal: 250, serving: '1 ขวด', emoji: '🍺', category: 'alcohol' },
  { slug: 'whisky-soda', name: 'เหล้าโซดา', kcal: 500, serving: '5 แก้ว', emoji: '🥃', category: 'alcohol', aliases: ['วิสกี้', 'เหล้าขาว', 'ดริ๊งค์'] },
  { slug: 'soju', name: 'โซจู', kcal: 540, serving: '1 ขวด', emoji: '🍶', category: 'alcohol', aliases: ['soju'] },
  { slug: 'wine', name: 'ไวน์แดง', kcal: 250, serving: '2 แก้ว', emoji: '🍷', category: 'alcohol', aliases: ['ไวน์', 'wine'] },
  { slug: 'cocktail', name: 'ค็อกเทล', kcal: 400, serving: '2 แก้ว', emoji: '🍹', category: 'alcohol', aliases: ['ค็อกเทล', 'cocktail'] },

  /* ---------------- ขนมซอง / ของกินเล่น ---------------- */
  { slug: 'potato-chips', name: 'มันฝรั่งทอดกรอบ', kcal: 300, serving: '1 ถุงกลาง', emoji: '🥔', category: 'snack', aliases: ['เลย์', 'มันฝรั่งแผ่น'] },
  { slug: 'popcorn', name: 'ป๊อปคอร์นเนย', kcal: 500, serving: '1 ถังกลาง', emoji: '🍿', category: 'snack', aliases: ['ป๊อปคอร์น'] },
  { slug: 'seaweed', name: 'สาหร่ายทอด', kcal: 200, serving: '1 ถุง', emoji: '🍘', category: 'snack', aliases: ['สาหร่าย'] },
  { slug: 'chocolate-bar', name: 'ช็อกโกแลตแท่ง', kcal: 250, serving: '1 แท่ง', emoji: '🍫', category: 'snack', aliases: ['ช็อกโกแลต'] },
  { slug: 'nuts', name: 'ถั่วอบเกลือ', kcal: 300, serving: '1 ถ้วย', emoji: '🥜', category: 'snack', aliases: ['ถั่ว'] },
  { slug: 'moo-phan', name: 'หมูแผ่น / หมูหยอง', kcal: 200, serving: '1 ซอง', emoji: '🥓', category: 'snack', aliases: ['หมูแผ่น', 'หมูหยอง'] },
  { slug: 'biscuit', name: 'ขนมปังกรอบ', kcal: 250, serving: '1 ห่อ', emoji: '🍪', category: 'snack', aliases: ['คุกกี้', 'บิสกิต'] },

  /* ---------------- ผลไม้ ---------------- */
  { slug: 'durian', name: 'ทุเรียนหมอนทอง', kcal: 450, serving: '3 เม็ด', emoji: '👑', category: 'fruit', aliases: ['ทุเรียน'] },
  { slug: 'mango', name: 'มะม่วงสุก', kcal: 200, serving: '1 ลูก', emoji: '🥭', category: 'fruit', aliases: ['มะม่วง'] },
  { slug: 'banana', name: 'กล้วยหอม', kcal: 100, serving: '1 ลูก', emoji: '🍌', category: 'fruit', aliases: ['กล้วย'] },
  { slug: 'watermelon', name: 'แตงโม', kcal: 90, serving: '1 จาน', emoji: '🍉', category: 'fruit' },
  { slug: 'orange', name: 'ส้ม', kcal: 120, serving: '2 ลูก', emoji: '🍊', category: 'fruit' },
  { slug: 'guava', name: 'ฝรั่ง', kcal: 110, serving: '1 ลูก', emoji: '🍈', category: 'fruit' },
  { slug: 'longan', name: 'ลำไย', kcal: 130, serving: '10 ลูก', emoji: '🟤', category: 'fruit' },
  { slug: 'rambutan', name: 'เงาะ', kcal: 150, serving: '10 ลูก', emoji: '🔴', category: 'fruit' },
  { slug: 'jackfruit', name: 'ขนุน', kcal: 160, serving: '5 ยวง', emoji: '🟡', category: 'fruit' },

  /* ---------------- 🏪 ร้านสะดวกซื้อ: ข้าวกล่องอุ่นร้อน ---------------- */
  { slug: 'cvs-box-kaphrao', name: 'ข้าวกล่องกะเพราหมูสับ', kcal: 500, serving: '1 กล่อง', emoji: '🍱', category: 'convenience', aliases: ['ข้าวกล่อง 7-11', 'กะเพรา 7-11', 'ข้าวกล่องกะเพรา'] },
  { slug: 'cvs-box-khao-man-kai', name: 'ข้าวกล่องข้าวมันไก่', kcal: 530, serving: '1 กล่อง', emoji: '🍱', category: 'convenience', aliases: ['ข้าวมันไก่ 7-11'] },
  { slug: 'cvs-box-moo-daeng', name: 'ข้าวกล่องข้าวหมูแดง', kcal: 480, serving: '1 กล่อง', emoji: '🍱', category: 'convenience' },
  { slug: 'cvs-box-kha-moo', name: 'ข้าวกล่องข้าวขาหมู', kcal: 550, serving: '1 กล่อง', emoji: '🍱', category: 'convenience' },
  { slug: 'cvs-box-kana-moo-krob', name: 'ข้าวกล่องคะน้าหมูกรอบ', kcal: 520, serving: '1 กล่อง', emoji: '🍱', category: 'convenience' },
  { slug: 'cvs-box-kai-jeaw', name: 'ข้าวกล่องข้าวไข่เจียว', kcal: 500, serving: '1 กล่อง', emoji: '🍱', category: 'convenience' },
  { slug: 'cvs-box-american', name: 'ข้าวกล่องข้าวผัดอเมริกัน', kcal: 700, serving: '1 กล่อง', emoji: '🍱', category: 'convenience' },
  { slug: 'cvs-box-pad-thai', name: 'ข้าวกล่องผัดไทย', kcal: 470, serving: '1 กล่อง', emoji: '🍱', category: 'convenience' },
  { slug: 'cvs-box-spaghetti', name: 'สปาเกตตี้กล่องขี้เมา', kcal: 450, serving: '1 กล่อง', emoji: '🍝', category: 'convenience' },
  { slug: 'cvs-box-gyudon', name: 'ข้าวกล่องข้าวหน้าเนื้อ', kcal: 550, serving: '1 กล่อง', emoji: '🍱', category: 'convenience' },
  { slug: 'cvs-sticky-fried-chicken', name: 'ข้าวเหนียวไก่ทอด', kcal: 450, serving: '1 ห่อ', emoji: '🍗', category: 'convenience' },
  { slug: 'cvs-jok-cup', name: 'โจ๊กคัพ', kcal: 140, serving: '1 ถ้วย', emoji: '🥣', category: 'convenience', aliases: ['โจ๊กถ้วย', 'โจ๊กคัพ'] },

  /* ---------------- 🏪 ร้านสะดวกซื้อ: นึ่ง / ทอดหน้าเคาน์เตอร์ ---------------- */
  { slug: 'cvs-salapao-moo', name: 'ซาลาเปาไส้หมูสับ', kcal: 200, serving: '1 ลูก', emoji: '🥟', category: 'convenience', aliases: ['ซาลาเปา'] },
  { slug: 'cvs-salapao-cream', name: 'ซาลาเปาไส้ครีม', kcal: 230, serving: '1 ลูก', emoji: '🥟', category: 'convenience', aliases: ['ซาลาเปาครีม', 'ซาลาเปาสังขยา'] },
  { slug: 'cvs-kanom-jeeb', name: 'ขนมจีบ', kcal: 180, serving: '4 ลูก', emoji: '🥟', category: 'convenience' },
  { slug: 'cvs-sausage-vienna', name: 'ไส้กรอกเวียนนา', kcal: 250, serving: '1 ซอง (5 ชิ้น)', emoji: '🌭', category: 'convenience', aliases: ['ไส้กรอกเวียนนา'] },
  { slug: 'cvs-sausage-cheese', name: 'ไส้กรอกชีส', kcal: 180, serving: '1 ไม้', emoji: '🧀', category: 'convenience' },
  { slug: 'cvs-tod-man', name: 'ทอดมันปลา', kcal: 250, serving: '3 ชิ้น', emoji: '🐟', category: 'convenience', aliases: ['ทอดมัน'] },
  { slug: 'cvs-hotdog', name: 'ฮอทดอกใหญ่', kcal: 380, serving: '1 ชิ้น', emoji: '🌭', category: 'convenience' },
  { slug: 'cvs-burger', name: 'แฮมเบอร์เกอร์อุ่นร้อน', kcal: 350, serving: '1 ชิ้น', emoji: '🍔', category: 'convenience' },
  { slug: 'cvs-onsen-egg', name: 'ไข่ออนเซ็น', kcal: 80, serving: '1 ฟอง', emoji: '🥚', category: 'convenience', aliases: ['ไข่ออนเซน'] },

  /* ---------------- 🏪 ร้านสะดวกซื้อ: เบเกอรี่ / แซนด์วิช ---------------- */
  { slug: 'cvs-sandwich-tuna', name: 'แซนด์วิชทูน่า', kcal: 300, serving: '1 ชิ้น', emoji: '🥪', category: 'convenience', aliases: ['แซนวิชทูน่า'] },
  { slug: 'cvs-sandwich-egg', name: 'แซนด์วิชไข่', kcal: 280, serving: '1 ชิ้น', emoji: '🥪', category: 'convenience' },
  { slug: 'cvs-croissant-sausage', name: 'ครัวซองต์ไส้กรอก', kcal: 330, serving: '1 ชิ้น', emoji: '🥐', category: 'convenience' },
  { slug: 'cvs-pie-chicken', name: 'พายไก่', kcal: 250, serving: '1 ชิ้น', emoji: '🥧', category: 'convenience', aliases: ['พายไก่'] },
  { slug: 'cvs-pie-pineapple', name: 'พายสับปะรด', kcal: 230, serving: '1 ชิ้น', emoji: '🥧', category: 'convenience' },
  { slug: 'cvs-bread-sangkaya', name: 'ขนมปังสังขยา', kcal: 260, serving: '1 ห่อ', emoji: '🍞', category: 'convenience' },
  { slug: 'cvs-cake-slice', name: 'เค้กชิ้น', kcal: 320, serving: '1 ชิ้น', emoji: '🍰', category: 'convenience' },

  /* ---------------- 🏪 ร้านสะดวกซื้อ: เครื่องดื่ม ---------------- */
  { slug: 'cvs-latte-iced', name: 'ลาเต้เย็น (ร้านสะดวกซื้อ)', kcal: 180, serving: '1 แก้ว', emoji: '☕', category: 'convenience', aliases: ['ออลคาเฟ่', 'all cafe', 'ลาเต้เย็น 7-11'] },
  { slug: 'cvs-cappuccino', name: 'คาปูชิโน่เย็น', kcal: 200, serving: '1 แก้ว', emoji: '☕', category: 'convenience' },
  { slug: 'cvs-black-coffee', name: 'กาแฟดำเย็นไม่ใส่น้ำตาล', kcal: 10, serving: '1 แก้ว', emoji: '☕', category: 'convenience' },
  { slug: 'cvs-slurpee', name: 'สแลชชี่น้ำแข็งปั่น', kcal: 150, serving: '1 แก้วกลาง', emoji: '🥤', category: 'convenience', aliases: ['สแลชชี่', 'slurpee'] },
  { slug: 'cvs-green-tea-bottle', name: 'ชาเขียวขวด', kcal: 120, serving: '1 ขวด', emoji: '🍵', category: 'convenience', aliases: ['ชาเขียวขวด', 'โออิชิ', 'อิชิตัน'] },
  { slug: 'cvs-yogurt-drink', name: 'นมเปรี้ยวพร้อมดื่ม', kcal: 130, serving: '1 ขวด', emoji: '🥛', category: 'convenience', aliases: ['นมเปรี้ยว', 'ยาคูลท์'] },
  { slug: 'cvs-milk-box', name: 'นมกล่องรสจืด', kcal: 120, serving: '1 กล่อง 200 มล.', emoji: '🥛', category: 'convenience', aliases: ['นมกล่อง'] },
  { slug: 'cvs-choc-milk', name: 'นมช็อกโกแลต', kcal: 180, serving: '1 กล่อง', emoji: '🍫', category: 'convenience' },
  { slug: 'cvs-energy-drink', name: 'เครื่องดื่มชูกำลัง', kcal: 120, serving: '1 ขวด', emoji: '⚡', category: 'convenience', aliases: ['กระทิงแดง', 'เอ็ม150', 'ชูกำลัง'] },
  { slug: 'cvs-chicken-essence', name: 'ซุปไก่สกัด', kcal: 30, serving: '1 ขวด', emoji: '🍯', category: 'convenience' },
  { slug: 'cvs-water', name: 'น้ำเปล่า', kcal: 0, serving: '1 ขวด', emoji: '💧', category: 'convenience', aliases: ['น้ำเปล่า', 'น้ำดื่ม'] },

  /* ---------------- 🏪 ร้านสะดวกซื้อ: ขนม / ของว่าง ---------------- */
  { slug: 'cvs-ice-cream-bar', name: 'ไอศกรีมแท่งเคลือบช็อกโกแลต', kcal: 250, serving: '1 แท่ง', emoji: '🍫', category: 'convenience', aliases: ['ไอศกรีมแท่ง'] },
  { slug: 'cvs-ice-cream-cone', name: 'ไอศกรีมโคน', kcal: 200, serving: '1 อัน', emoji: '🍦', category: 'convenience' },
  { slug: 'cvs-fish-snack', name: 'ปลาเส้น', kcal: 120, serving: '1 ซอง', emoji: '🐟', category: 'convenience', aliases: ['ปลาเส้น'] },
  { slug: 'cvs-prawn-cracker', name: 'ข้าวเกรียบกุ้ง', kcal: 250, serving: '1 ถุง', emoji: '🍤', category: 'convenience' },
  { slug: 'cvs-cookie-pack', name: 'คุกกี้ห่อเล็ก', kcal: 200, serving: '1 ห่อ', emoji: '🍪', category: 'convenience' },
  { slug: 'cvs-jelly', name: 'เยลลี่', kcal: 80, serving: '1 ถ้วย', emoji: '🍮', category: 'convenience' },
  { slug: 'cvs-salad', name: 'สลัดผักพร้อมทาน', kcal: 150, serving: '1 กล่อง', emoji: '🥗', category: 'convenience' },
  { slug: 'cvs-cut-fruit', name: 'ผลไม้ตัดพร้อมทาน', kcal: 90, serving: '1 กล่อง', emoji: '🍉', category: 'convenience' },

  /* ---------------- อาหารคลีน ---------------- */
  { slug: 'chicken-salad', name: 'สลัดอกไก่', kcal: 350, serving: '1 จาน', emoji: '🥗', category: 'clean', aliases: ['สลัด'] },
  { slug: 'grilled-chicken-breast', name: 'อกไก่ย่าง', kcal: 330, serving: '200 กรัม', emoji: '🍗', category: 'clean', aliases: ['อกไก่'] },
  { slug: 'boiled-egg', name: 'ไข่ต้ม', kcal: 155, serving: '2 ฟอง', emoji: '🥚', category: 'clean', aliases: ['ไข่ต้ม'] },
  { slug: 'veggie-salad', name: 'สลัดผักน้ำใส', kcal: 120, serving: '1 จาน', emoji: '🥬', category: 'clean' },
  { slug: 'brown-rice', name: 'ข้าวกล้อง', kcal: 220, serving: '1 จาน', emoji: '🍚', category: 'clean' },
  { slug: 'protein-shake', name: 'เวย์โปรตีนเชค', kcal: 150, serving: '1 แก้ว', emoji: '🥤', category: 'clean', aliases: ['เวย์', 'โปรตีน', 'whey'] },
  { slug: 'clean-set', name: 'อกไก่ + ข้าวกล้อง + ผัก', kcal: 500, serving: '1 กล่อง', emoji: '🍱', category: 'clean', aliases: ['อาหารคลีน', 'คลีน'] },
]

/** อาหาร "ตัวร้าย" ที่ใช้ยกเป็นตัวอย่างหลักในหัวข้อ SEO */
export const HERO_FOOD = POPULAR_FOODS.find((f) => f.slug === 'moo-krata')!

/** เมนูที่โชว์เป็นปุ่มลัดใน Step 1 */
export const QUICK_PICK_FOODS: FoodItem[] = [
  'moo-krata',
  'shabu-buffet',
  'kaphrao-kai-dao',
  'fried-chicken',
  'bubble-tea',
  'moo-ping',
  'beer',
  'mama-tomyum',
]
  .map((slug) => POPULAR_FOODS.find((f) => f.slug === slug))
  .filter((f): f is FoodItem => Boolean(f))

/**
 * ชุดอาหารสำหรับตารางในหน้า SEO
 * คัดมาเฉพาะเมนูที่คนค้นหาเยอะ — ไม่ใช้ทั้ง POPULAR_FOODS เพราะจะได้ตาราง
 * ยาวเป็นร้อยแถวจนหน้าเว็บอืดและ Google มองว่าเป็น thin content
 */
export const SEO_TABLE_FOODS: FoodItem[] = [
  'moo-krata',
  'shabu-buffet',
  'yakiniku',
  'pizza-buffet',
  'burger-set',
  'khao-pad-american',
  'fried-chicken',
  'khao-kha-moo',
  'katsu-curry',
  'khao-man-kai',
  'kaphrao-kai-dao',
  'pad-thai',
  'roti',
  'bingsu',
  'mango-sticky-rice',
  'moo-krob',
  'ramen',
  'donut',
  'moo-ping',
  'mama-tomyum',
  'beer',
  'bubble-tea',
  'som-tam',
  'soft-drink',
]
  .map((slug) => POPULAR_FOODS.find((f) => f.slug === slug))
  .filter((f): f is FoodItem => Boolean(f))

/* ==========================================================================
 * CALCULATION
 * ======================================================================== */

/** ตัวเลือกเสริมที่ใช้ได้กับเมนูนี้ */
export function getAddonsFor(food: FoodItem): FoodAddon[] {
  return FOOD_ADDONS.filter((addon) => addon.appliesTo.includes(food.category))
}

/**
 * คำนวณแคลอรี่รวมของ 1 ออเดอร์
 *
 * ตัวคูณ (พิเศษ / หวานน้อย) คูณกับเมนูหลัก × จำนวนหน่วย
 * ส่วนของเพิ่มแบบคงที่ (ไข่ดาว / ข้าวเพิ่ม) บวกครั้งเดียว ไม่คูณตามจำนวนหน่วย
 */
export function computeFoodKcal(
  food: FoodItem,
  portion: number,
  addonSlugs: string[] = [],
): number {
  const addons = FOOD_ADDONS.filter((a) => addonSlugs.includes(a.slug))

  const multiplier = addons.reduce((acc, a) => acc * (a.multiplier ?? 1), 1)
  const flat = addons.reduce((acc, a) => acc + (a.kcal ?? 0), 0)

  return Math.max(0, Math.round(food.kcal * portion * multiplier + flat))
}

/* ==========================================================================
 * SEARCH — ใช้กับ autocomplete ใน Step 1
 * ======================================================================== */

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '').trim()
}

/**
 * ตัดคำสั่งเสริมออกจากชื่อเมนูก่อนนำไปจับคู่
 *
 * ทำไมต้องมี: คนไทยพิมพ์ "ข้าวกะเพราพิเศษ ไข่ดาว" มาเป็นก้อนเดียว
 * ถ้าไม่ตัด "พิเศษ" กับ "ไข่ดาว" ออกก่อน จะจับคู่กับ "ข้าวกะเพราหมูสับ" ไม่ติดเลย
 * (เรียงคำยาวไปสั้น ไม่งั้น "เพิ่ม" จะไปกิน "ข้าวเพิ่ม" ก่อน)
 */
const MODIFIER_WORDS: string[] = [
  ...FOOD_ADDONS.flatMap((a) => a.keywords ?? []),
  'ธรรมดา',
  'เผ็ดน้อย',
  'เผ็ดมาก',
  'ห่อกลับ',
  'กลับบ้าน',
  'แยกน้ำ',
].sort((a, b) => b.length - a.length)

function stripModifiers(text: string): string {
  let out = normalize(text)
  for (const word of MODIFIER_WORDS) {
    out = out.split(normalize(word)).join('')
  }
  return out.replace(/[0-9]+/g, '')
}

/**
 * คะแนนความตรงของคำค้นเดียว: ยิ่งมากยิ่งตรง (0 = ไม่ตรงเลย)
 *
 * ต้องเทียบให้ครบทุกช่องทางแล้วเอาคะแนนสูงสุด ห้าม return ทันทีที่เจอ —
 * ไม่งั้น "ข้าวกะเพรา" จะได้ 80 จากการที่ชื่อ "ข้าวกะเพราทะเล" ขึ้นต้นตรงกัน
 * แล้วไม่มีวันไปถึง alias "ข้าวกะเพรา" ของเมนูหมูสับที่ตรงเป๊ะ (90)
 */
function scoreAgainst(food: FoodItem, q: string): number {
  if (!q) return 0

  let best = 0
  const bump = (value: number) => {
    if (value > best) best = value
  }

  const name = normalize(food.name)
  if (name === q) bump(100)
  else if (name.startsWith(q)) bump(80)
  else if (name.includes(q)) bump(60)
  // ผู้ใช้พิมพ์ละเอียดกว่าชื่อในฐานข้อมูล เช่น "ข้าวผัดปู" → เจอ "ข้าวผัด"
  else if (name.length >= 3 && q.includes(name)) bump(55)

  for (const alias of food.aliases ?? []) {
    const a = normalize(alias)
    if (a === q) bump(90)
    else if (a.startsWith(q)) bump(70)
    else if (a.includes(q)) bump(50)
    else if (a.length >= 3 && q.includes(a)) bump(55)
  }

  return best
}

/** ให้คะแนนทั้งคำค้นดิบและคำค้นที่ตัดคำสั่งเสริมออกแล้ว เอาค่าที่ดีกว่า */
function scoreFood(food: FoodItem, query: string): number {
  return Math.max(scoreAgainst(food, normalize(query)), scoreAgainst(food, stripModifiers(query)))
}

/**
 * ค้นหาเมนูจากสิ่งที่ผู้ใช้พิมพ์ (ชื่อเมนู + คำพ้องภาษาไทย/อังกฤษ)
 * @param query คำค้น
 * @param limit จำนวนผลลัพธ์สูงสุด
 */
export function searchFoods(query: string, limit = 6): FoodItem[] {
  if (normalize(query).length < 1) return []

  return POPULAR_FOODS.map((food) => ({ food, score: scoreFood(food, query) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || b.food.kcal - a.food.kcal)
    .slice(0, limit)
    .map((row) => row.food)
}

/**
 * หาเมนูที่ "ตรงพอ" จะเติมแคลอรี่ให้อัตโนมัติ
 * ใช้เกณฑ์เข้มกว่า searchFoods เพื่อไม่ให้เดาผิดแล้วไปทับเลขที่ผู้ใช้ตั้งใจพิมพ์
 */
export function matchFoodForAutofill(query: string): FoodItem | null {
  if (normalize(query).length < 2) return null

  const best = POPULAR_FOODS.map((food) => ({ food, score: scoreFood(food, query) }))
    // คะแนนเท่ากัน → เลือกชื่อที่กว้างกว่า เช่น "ข้าวกะเพรา" ควรได้ "หมูสับ" ไม่ใช่ "ไก่กรอบ"
    .filter((row) => row.score >= 55)
    .sort((a, b) => b.score - a.score || a.food.name.length - b.food.name.length)[0]

  return best?.food ?? null
}

/**
 * อ่านคำสั่งเสริมจากข้อความที่ผู้ใช้พิมพ์ เช่น "ข้าวกะเพราพิเศษ ไข่ดาว"
 * → ['special', 'egg_fried']
 *
 * ข้ามตัวที่ชื่อเมนูมีอยู่แล้ว (เช่นเลือกเมนู "...+ ไข่ดาว" มา) เพื่อไม่ให้บวกซ้ำ
 */
export function detectAddonsFromText(text: string, food: FoodItem): string[] {
  const q = normalize(text)
  const name = normalize(food.name)
  const allowed = getAddonsFor(food)

  const matched = allowed.filter((addon) =>
    (addon.keywords ?? []).some((kw) => {
      const k = normalize(kw)
      return q.includes(k) && !name.includes(k)
    }),
  )

  // ในกลุ่มที่เลือกได้ทีละอย่าง เก็บแค่ตัวแรกที่เจอ
  // เผื่อผู้ใช้พิมพ์ "ก๋วยเตี๋ยวเส้นใหญ่วุ้นเส้น" ซึ่งสั่งจริงไม่ได้
  const seenGroups = new Set<string>()
  return matched
    .filter((addon) => {
      if (!addon.exclusiveGroup) return true
      if (seenGroups.has(addon.exclusiveGroup)) return false
      seenGroups.add(addon.exclusiveGroup)
      return true
    })
    .map((addon) => addon.slug)
}

/** ตรวจว่าผู้ใช้พิมพ์คำว่า "พิเศษ" มาในชื่อเมนูหรือเปล่า */
export function mentionsSpecial(query: string): boolean {
  return /พิเศษ|special/i.test(query)
}
