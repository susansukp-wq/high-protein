/**
 * og.ts — สร้างรูป Open Graph (1200×630) ตอน build
 *
 * ทำไมต้องทำเอง แทนที่จะใช้บริการ OG image สำเร็จรูป:
 *   บริการพวกนั้นคิดเงินต่อการเรียก 1 ครั้ง และต้องมี server รันตลอด
 *   วิธีนี้ satori แปลง layout → SVG แล้ว resvg แปลง SVG → PNG ตอน build
 *   ได้ไฟล์ .png นิ่งๆ วางไว้บน CDN — ค่าใช้จ่ายรันไทม์ = 0 บาท
 *
 * ข้อควรรู้: satori วาด emoji ไม่ได้ถ้าไม่โหลดรูปเพิ่มจากอินเทอร์เน็ต
 * การ์ดนี้จึงใช้ตัวอักษรกับสีล้วน ไม่มี emoji — กัน build พังเวลาเน็ตมีปัญหา
 */

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

const require = createRequire(import.meta.url)

const COLOR = {
  void: '#0a0a0a',
  concrete: '#171717',
  steel: '#2a2a2a',
  hazard: '#facc15',
  blood: '#dc2626',
  white: '#f5f5f5',
  muted: '#8a8a8a',
} as const

/* -------------------------------------------------------------------------- */
/*  FONTS — โหลดจาก node_modules ไม่ต้องยิงเน็ตตอน build                        */
/* -------------------------------------------------------------------------- */

function fontFile(name: string): Buffer {
  return readFileSync(require.resolve(`@fontsource/anuphan/files/${name}`))
}

/**
 * Fontsource ตัดฟอนต์เป็น subset แยกภาษา ไฟล์ไทยจึงไม่มี glyph ของ A-Z และ 0-9
 *
 * ถ้าลงทะเบียนทั้งสองไฟล์ด้วยชื่อ family เดียวกัน satori จะหยิบมาใช้แค่ไฟล์แรก
 * แล้วตัวเลข/ภาษาอังกฤษจะกลายเป็นสี่เหลี่ยมเปล่า (□□A□ แทน MUAY THAI)
 * ทางแก้คือตั้งชื่อคนละ family แล้วประกาศเป็น font stack ให้ไล่ fallback ทีละตัว
 */
const FONT_STACK = 'Anuphan, AnuphanLatin'

const fonts = [
  { name: 'Anuphan', data: fontFile('anuphan-thai-700-normal.woff'), weight: 700 as const, style: 'normal' as const },
  { name: 'Anuphan', data: fontFile('anuphan-thai-400-normal.woff'), weight: 400 as const, style: 'normal' as const },
  { name: 'AnuphanLatin', data: fontFile('anuphan-latin-700-normal.woff'), weight: 700 as const, style: 'normal' as const },
  { name: 'AnuphanLatin', data: fontFile('anuphan-latin-400-normal.woff'), weight: 400 as const, style: 'normal' as const },
]

/* -------------------------------------------------------------------------- */
/*  ELEMENT HELPER — satori รับโครงสร้างแบบ React element โดยไม่ต้องใช้ JSX     */
/* -------------------------------------------------------------------------- */

type Node = string | { type: string; props: Record<string, unknown> }

function el(
  type: string,
  style: Record<string, unknown>,
  children?: Node | Node[],
): Node {
  return { type, props: { style, children } }
}

/* -------------------------------------------------------------------------- */
/*  CARD                                                                      */
/* -------------------------------------------------------------------------- */

export interface OgCardInput {
  /** บรรทัดเล็กบนสุด เช่น "METs 9.8 · CARDIO" */
  eyebrow: string
  /** พาดหัวหลัก */
  title: string
  /** บรรทัดที่เน้นสีเหลือง (ตัวเลขเด็ด) */
  highlight?: string
  /** คำอธิบายใต้พาดหัว */
  subtitle?: string
  /** โทนสี — danger = แถบแดง */
  tone?: 'hazard' | 'danger'
}

function buildCard(input: OgCardInput): Node {
  const accent = input.tone === 'danger' ? COLOR.blood : COLOR.hazard

  return el(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      width: '1200px',
      height: '630px',
      backgroundColor: COLOR.void,
      fontFamily: FONT_STACK,
    },
    [
      // แถบเตือนด้านบน
      el('div', { display: 'flex', width: '100%', height: '18px', backgroundColor: accent }),

      el(
        'div',
        {
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          padding: '56px 64px',
          justifyContent: 'space-between',
        },
        [
          el(
            'div',
            { display: 'flex', flexDirection: 'column' },
            [
              el(
                'div',
                {
                  display: 'flex',
                  fontSize: '24px',
                  fontWeight: 700,
                  color: accent,
                  letterSpacing: '3px',
                  marginBottom: '18px',
                },
                input.eyebrow,
              ),
              el(
                'div',
                {
                  display: 'flex',
                  fontSize: input.title.length > 42 ? '58px' : '70px',
                  fontWeight: 700,
                  color: COLOR.white,
                  lineHeight: 1.15,
                },
                input.title,
              ),
              ...(input.highlight
                ? [
                    el(
                      'div',
                      {
                        display: 'flex',
                        fontSize: '86px',
                        fontWeight: 700,
                        color: accent,
                        lineHeight: 1.1,
                        marginTop: '8px',
                      },
                      input.highlight,
                    ),
                  ]
                : []),
              ...(input.subtitle
                ? [
                    el(
                      'div',
                      {
                        display: 'flex',
                        fontSize: '30px',
                        fontWeight: 400,
                        color: COLOR.muted,
                        marginTop: '20px',
                      },
                      input.subtitle,
                    ),
                  ]
                : []),
            ],
          ),

          // แถบล่าง: ชื่อเว็บ
          el(
            'div',
            {
              display: 'flex',
              alignItems: 'center',
              borderTop: `4px solid ${COLOR.steel}`,
              paddingTop: '24px',
            },
            [
              el(
                'div',
                { display: 'flex', fontSize: '30px', fontWeight: 700, color: COLOR.white },
                'ลดน้ำหนัก',
              ),
              el(
                'div',
                { display: 'flex', fontSize: '30px', fontWeight: 700, color: COLOR.blood },
                'ไม่มีคำว่าปลอบใจ',
              ),
              el(
                'div',
                {
                  display: 'flex',
                  marginLeft: 'auto',
                  fontSize: '24px',
                  fontWeight: 400,
                  color: COLOR.muted,
                },
                'คำนวณจากค่า METs จริง',
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

/** แปลงเป็น PNG buffer พร้อมส่งเป็น Response */
export async function renderOgImage(input: OgCardInput): Promise<Buffer> {
  const svg = await satori(buildCard(input) as never, {
    width: 1200,
    height: 630,
    fonts,
  })

  return Buffer.from(
    new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng(),
  )
}
