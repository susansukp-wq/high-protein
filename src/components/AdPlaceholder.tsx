/**
 * AdPlaceholder.tsx — ช่องโฆษณา AdSense ที่จองพื้นที่ไว้ตั้งแต่ต้น
 *
 * ปัญหาที่คอมโพเนนต์นี้แก้:
 *   สคริปต์ AdSense โหลดช้ากว่าเนื้อหาเสมอ ถ้าไม่จองความสูงไว้ล่วงหน้า
 *   พอโฆษณาโผล่มันจะดันเนื้อหาลงไป = Cumulative Layout Shift (CLS) พุ่ง
 *   ซึ่งเป็นหนึ่งใน Core Web Vitals ที่ Google ใช้จัดอันดับโดยตรง
 *
 *   ทุก format จึงกำหนด min-height ไว้ตายตัวตามขนาดจริงของโฆษณา
 *   พื้นที่ถูกจองตั้งแต่ HTML แรกที่เสิร์ฟออกไป ไม่มีการกระตุกทีหลัง
 *
 * พฤติกรรม:
 *   - ไม่ได้ตั้ง PUBLIC_ADSENSE_CLIENT_ID → โชว์ skeleton อย่างเดียว ไม่ยิงสคริปต์
 *     (ทำให้ dev ในเครื่องไม่กินโควต้าและไม่เสี่ยงโดนแบนจาก invalid traffic)
 *   - โฆษณาโหลดสำเร็จ → skeleton หายไป
 *   - AdSense ไม่มีโฆษณาให้ (unfilled) → ยุบพื้นที่ทิ้ง ไม่ปล่อยกล่องว่างค้างไว้
 */

import { useEffect, useRef, useState } from 'react'

export type AdFormat = 'auto' | 'rectangle' | 'horizontal' | 'vertical'

const CLIENT_ID = import.meta.env.PUBLIC_ADSENSE_CLIENT_ID ?? ''

/**
 * ความสูงขั้นต่ำของแต่ละรูปแบบ อิงขนาดจริงที่ AdSense เสิร์ฟ
 * มือถือกับเดสก์ท็อปคนละค่า เพราะ AdSense ส่งขนาดต่างกันตามความกว้างจอ
 */
const FORMAT_CLASS: Record<AdFormat, string> = {
  // 300×250 บนมือถือ, ขยับเป็น 336×280 บนจอใหญ่
  rectangle: 'min-h-[250px] sm:min-h-[280px]',
  // 320×100 บนมือถือ, 728×90 บนเดสก์ท็อป
  horizontal: 'min-h-[100px] sm:min-h-[90px]',
  // 300×600 สกายสเครเปอร์
  vertical: 'min-h-[600px]',
  // responsive ปล่อยให้ AdSense เลือกเอง แต่ยังต้องจองพื้นที่ขั้นต่ำไว้
  auto: 'min-h-[280px]',
}

/** ข้อความระหว่างรอโฆษณา — เว็บนี้ไม่ปล่อยให้พื้นที่ไหนว่างจากการจิกกัด */
const LOADING_TAUNTS = [
  'พื้นที่โฆษณา (กำลังโหลด... ไปวิดพื้นรอไปก่อน)',
  'โฆษณากำลังมา ระหว่างนี้สควอท 10 ทีพอดีเวลา',
  'รอโฆษณาโหลด — ยืดเส้นยืดสายหน่อยก็ดีนะ ไม่ต้องนั่งเฉย',
  'พื้นที่นี้ขายโฆษณา ไม่ได้ขายคำปลอบใจ',
  'โฆษณายังไม่มา แต่พุงมาแล้ว ลุกไปขยับตัวสิ',
]

/**
 * เลือกข้อความจาก adSlot ไม่ใช่สุ่ม
 * เพราะคอมโพเนนต์นี้ถูก SSR ก่อนแล้วค่อย hydrate — ถ้าสุ่มจะได้คนละค่า
 * ระหว่างฝั่งเซิร์ฟเวอร์กับฝั่ง client แล้ว React จะฟ้อง hydration mismatch
 */
function pickTaunt(seed: string): string {
  const sum = [...seed].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return LOADING_TAUNTS[sum % LOADING_TAUNTS.length]!
}

type AdState = 'idle' | 'filled' | 'unfilled'

export interface AdPlaceholderProps {
  /** รหัสช่องโฆษณาจาก AdSense (ตัวเลขล้วน เช่น "1234567890") */
  adSlot: string
  format?: AdFormat
  /** ป้ายกำกับเหนือกล่อง — ตามนโยบาย AdSense โฆษณาต้องแยกออกจากเนื้อหาให้ชัด */
  label?: string
  className?: string
  /** ปิดโฆษณาเฉพาะจุด เช่น หน้าที่เนื้อหาสุ่มเสี่ยงต่อนโยบาย */
  disabled?: boolean
}

export default function AdPlaceholder({
  adSlot,
  format = 'auto',
  label = 'โฆษณา',
  className = '',
  disabled = false,
}: AdPlaceholderProps) {
  const insRef = useRef<HTMLModElement>(null)
  const hasPushed = useRef(false)
  const [state, setState] = useState<AdState>('idle')

  // ต้องมีครบทั้ง client id และ slot id ถึงจะยิงสคริปต์ได้
  const isEnabled = Boolean(CLIENT_ID) && Boolean(adSlot) && !disabled

  useEffect(() => {
    if (!isEnabled || hasPushed.current) return
    const ins = insRef.current
    if (!ins) return

    // React StrictMode เรียก effect ซ้ำตอน dev — push ซ้ำจะได้ error
    // "adsbygoogle.push() error: All ins elements already have ads in them"
    hasPushed.current = true

    try {
      const win = window as typeof window & { adsbygoogle?: unknown[] }
      win.adsbygoogle = win.adsbygoogle || []
      win.adsbygoogle.push({})
    } catch (err) {
      console.error('[AdPlaceholder] push ไม่สำเร็จ', err)
      setState('unfilled')
      return
    }

    // AdSense เขียน data-ad-status ลงบน <ins> เมื่อตัดสินใจได้ว่าจะเสิร์ฟหรือไม่
    const observer = new MutationObserver(() => {
      const status = ins.getAttribute('data-ad-status')
      if (status === 'filled') setState('filled')
      else if (status === 'unfilled') setState('unfilled')
    })

    observer.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] })
    return () => observer.disconnect()
  }, [isEnabled])

  // ไม่มีโฆษณาให้เสิร์ฟ → ยุบทิ้ง ดีกว่าปล่อยกล่องเปล่าค้างหน้าจอ
  if (state === 'unfilled') return null

  const reserved = FORMAT_CLASS[format]

  return (
    <aside
      aria-label={label}
      className={`relative w-full overflow-hidden ${reserved} ${className}`}
    >
      {/* Skeleton ที่จองพื้นที่ไว้ — ซ่อนเมื่อโฆษณาโหลดสำเร็จ */}
      {state !== 'filled' && (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-steel bg-concrete px-4 text-center`}
        >
          <span className="text-[10px] font-black tracking-[0.2em] text-neutral-600 uppercase">
            {label}
          </span>
          <span className="text-xs font-bold text-neutral-500">{pickTaunt(adSlot)}</span>
        </div>
      )}

      {isEnabled && (
        <ins
          ref={insRef}
          className="adsbygoogle relative block w-full"
          style={{ display: 'block' }}
          data-ad-client={CLIENT_ID}
          data-ad-slot={adSlot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      )}
    </aside>
  )
}
