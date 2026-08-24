/**
 * CalculatorFlow.tsx — React Island หลักของแอป
 *
 * Flow:
 *   1. โปรไฟล์  — ชื่อ เพศ ส่วนสูง น้ำหนัก อายุ (กรอกครั้งเดียว จำไว้ให้)
 *   2. อาหาร    — พิมพ์ชื่อเมนู ระบบเติมแคลอรี่ให้ + ตัวเลือก "พิเศษ"
 *   3. คำตัดสิน — เทียบกับโควต้าต่อมื้อที่คำนวณจาก BMR/TDEE ของคนคนนั้น
 *                 ไม่เกิน → นอนเฉยๆ ได้ / เกิน → เลือกกิจกรรมไปชดใช้
 */

import { useEffect, useMemo, useState } from 'react'
// profile.ts และ supabase.ts ลาก supabase-js มาด้วย (57 KB gzip)
// จึงโหลดแบบ dynamic เฉพาะตอนที่ต้องใช้จริง ไม่ใช่ตอนเปิดหน้าเว็บ
// ส่วน peekDeviceId กับ toBodyProfile เป็นฟังก์ชันเบาๆ import ตรงได้
import { peekDeviceId } from '../lib/device'
import { SEVERITY_LABEL, calculateBurnTime, formatDuration, getSeverityLevel } from '../lib/calculator'
import {
  BMI_LABEL,
  GENDER_LABEL,
  toBodyProfile,
  THAI_RDI,
  calculateBMI,
  calculateTDEE,
  getBmiBand,
  judgeMeal,
  mealBudget,
  type BodyProfile,
  type Gender,
  type MealJudgement,
} from '../lib/health'
import {
  DANGER_TAUNTS,
  HYROX_SLUG,
  NO_ACTIVITY_MEMES,
  SAFE_TAUNTS,
  SANDBAG_MEMES,
  WARN_TAUNTS,
  getAgeNote,
  hasLatinLetters,
  hasThaiLetters,
  pickEnglishNameTaunt,
  pickTaunt,
} from '../data/taunts'
import {
  ACTIVITY_GROUP_LABEL,
  ACTIVITY_GROUP_ORDER,
  type Activity,
  type ActivityGroup,
  type Profile,
} from '../lib/types'
import AdPlaceholder from './AdPlaceholder'
import { AD_SLOTS, isAdAllowed } from '../config/ads'
import {
  QUICK_PICK_FOODS,
  computeFoodKcal,
  detectAddonsFromText,
  getAddonsFor,
  matchFoodForAutofill,
  searchFoods,
  type FoodAddon,
  type FoodItem,
} from '../data/popular-foods'

type Step = 'profile' | 'food' | 'verdict'
type KcalSource = 'auto' | 'manual'

/** 1 มื้อประกอบด้วยได้หลายเมนู — เก็บเป็นรายการย่อยแล้วรวมแคลอรี่ตอนตัดสิน */
interface MealItem {
  id: string
  name: string
  kcal: number
  /** รายละเอียดเสริม เช่น "×2 · พิเศษ + ไข่ดาว" */
  detail: string
}

let itemCounter = 0
const nextItemId = () => `item-${++itemCounter}`

const PORTION_OPTIONS = [0.5, 1, 1.5, 2, 3] as const
const GENDERS: Gender[] = ['male', 'female', 'other']

interface Props {
  initialActivities?: Activity[]
  initialError?: string | null
  /** บังคับเลือกกิจกรรมไว้ล่วงหน้า — ใช้ในหน้า /burn/[slug] */
  defaultActivitySlug?: string
  /** เติมอาหารไว้ล่วงหน้า — ใช้ในหน้า /food/[slug] */
  defaultFood?: { name: string; kcal: number }
}

export default function CalculatorFlow({
  initialActivities = [],
  initialError = null,
  defaultActivitySlug,
  defaultFood,
}: Props) {
  /* ------------------------------ โปรไฟล์ ------------------------------ */
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isBooting, setIsBooting] = useState(true)
  const [step, setStep] = useState<Step>('profile')

  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [age, setAge] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  /* ------------------------------- อาหาร ------------------------------- */
  const [foodName, setFoodName] = useState(defaultFood?.name ?? '')
  const [kcal, setKcal] = useState(defaultFood ? String(defaultFood.kcal) : '')
  const [kcalSource, setKcalSource] = useState<KcalSource>('auto')
  const [baseFood, setBaseFood] = useState<FoodItem | null>(null)
  const [portion, setPortion] = useState(1)
  const [addons, setAddons] = useState<string[]>([])
  /** เมนูที่ใส่เข้ามื้อนี้แล้ว */
  const [items, setItems] = useState<MealItem[]>([])

  /* ------------------------------ กิจกรรม ------------------------------ */
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [activitiesError, setActivitiesError] = useState<string | null>(initialError)
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)
  const [activitySlug, setActivitySlug] = useState(defaultActivitySlug ?? '')
  const [roast, setRoast] = useState('')
  const [isRoasting, setIsRoasting] = useState(false)

  const [error, setError] = useState('')

  /* ========================== boot ========================== */

  useEffect(() => {
    // ยังไม่มี device id = เข้าเว็บครั้งแรก ไม่มีโปรไฟล์ให้ดึงอยู่แล้ว
    // ออกตรงนี้เลยเพื่อไม่ต้องโหลด supabase-js ในหน้าแรก
    if (!peekDeviceId()) {
      setIsBooting(false)
      return
    }

    let cancelled = false

    import('../lib/profile')
      .then(({ getMyProfile }) => getMyProfile())
      .then((me) => {
        if (cancelled) return
        if (me) {
          setProfile(me)
          setName(me.nickname)
          if (me.gender) setGender(me.gender)
          if (me.height_cm) setHeight(String(me.height_cm))
          if (me.weight_kg) setWeight(String(me.weight_kg))
          if (me.age) setAge(String(me.age))
          // ข้อมูลครบแล้วก็ข้ามหน้ากรอกไปเลย ไม่ต้องถามซ้ำทุกครั้งที่เข้าเว็บ
          if (toBodyProfile(me)) setStep('food')
        }
      })
      .finally(() => {
        if (!cancelled) setIsBooting(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (initialActivities.length > 0) return
    void loadActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadActivities() {
    setIsLoadingActivities(true)
    const { getActivities } = await import('../lib/supabase')
    const { data, error: loadError } = await getActivities()
    setActivities(data)
    setActivitiesError(loadError)
    setIsLoadingActivities(false)
  }

  /* ========================== derived ========================== */

  const body: BodyProfile | null = useMemo(() => toBodyProfile(profile), [profile])
  const kcalNumber = Number(kcal)

  const totalKcal = useMemo(() => items.reduce((sum, item) => sum + item.kcal, 0), [items])
  const mealName = useMemo(() => summariseMeal(items), [items])

  const judgement: MealJudgement | null = useMemo(
    () => (body && totalKcal > 0 ? judgeMeal(totalKcal, body) : null),
    [body, totalKcal],
  )

  const availableAddons = useMemo<FoodAddon[]>(
    () => (baseFood ? getAddonsFor(baseFood) : []),
    [baseFood],
  )

  const groupedActivities = useMemo(() => {
    const map = new Map<ActivityGroup, Activity[]>()
    for (const activity of activities) {
      const bucket = map.get(activity.group_key) ?? []
      bucket.push(activity)
      map.set(activity.group_key, bucket)
    }
    return ACTIVITY_GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
      group: g,
      label: ACTIVITY_GROUP_LABEL[g],
      items: map.get(g)!,
    }))
  }, [activities])

  const selectedActivity = activities.find((a) => a.slug === activitySlug) ?? null

  /* ========================== profile handlers ========================== */

  const nameHasLatin = hasLatinLetters(name)
  const nameTaunt = nameHasLatin ? pickEnglishNameTaunt(name) : null
  const ageNote = getAgeNote(Number(age))

  const profileReady =
    name.trim().length >= 2 &&
    !nameHasLatin &&
    hasThaiLetters(name) &&
    gender !== '' &&
    Number(height) > 0 &&
    Number(weight) > 0 &&
    Number(age) > 0

  async function handleSaveProfile() {
    if (!profileReady) {
      setError('กรอกให้ครบทุกช่องก่อน แล้วชื่อต้องเป็นภาษาไทยด้วย')
      return
    }

    setIsSavingProfile(true)
    setError('')

    const input = {
      nickname: name.trim(),
      gender: gender as Gender,
      heightCm: Number(height),
      weightKg: Number(weight),
      age: Number(age),
    }

    const { createProfile, updateBodyProfile } = await import('../lib/profile')

    // มีโปรไฟล์อยู่แล้ว = แก้ข้อมูล / ยังไม่มี = สมัครใหม่
    const { data, error: saveError } = profile
      ? await updateBodyProfile(input)
      : await createProfile(input)

    setIsSavingProfile(false)

    if (saveError || !data) {
      setError(saveError ?? 'บันทึกไม่สำเร็จ')
      return
    }

    setProfile(data)
    setStep('food')
  }

  /* ========================== food handlers ========================== */

  function syncAutoKcal(food: FoodItem, nextPortion: number, nextAddons: string[]) {
    setKcal(String(computeFoodKcal(food, nextPortion, nextAddons)))
    setKcalSource('auto')
  }

  function handleFoodNameChange(value: string) {
    setFoodName(value)
    const match = matchFoodForAutofill(value)

    if (!match) {
      if (baseFood && kcalSource === 'auto') {
        setBaseFood(null)
        setAddons([])
        setKcal('')
      }
      return
    }

    const allowed = getAddonsFor(match).map((a) => a.slug)
    const kept = addons.filter((slug) => allowed.includes(slug))
    const nextAddons = [...new Set([...kept, ...detectAddonsFromText(value, match)])]

    setBaseFood(match)
    setAddons(nextAddons)
    if (kcalSource === 'auto') syncAutoKcal(match, portion, nextAddons)
  }

  function handleSelectFood(food: FoodItem) {
    setFoodName(food.name)
    setBaseFood(food)
    setPortion(1)
    setAddons([])
    syncAutoKcal(food, 1, [])
    setError('')
  }

  function handlePortionChange(next: number) {
    setPortion(next)
    if (baseFood) syncAutoKcal(baseFood, next, addons)
  }

  function handleToggleAddon(slug: string) {
    const next = addons.includes(slug) ? addons.filter((s) => s !== slug) : [...addons, slug]
    setAddons(next)
    if (baseFood) syncAutoKcal(baseFood, portion, next)
  }

  /** สร้างรายการจากฟอร์มที่กำลังกรอกอยู่ — null ถ้ายังกรอกไม่ครบ */
  function buildPendingItem(): MealItem | null {
    if (!foodName.trim() || !(kcalNumber > 0)) return null

    const parts: string[] = []
    if (portion !== 1) parts.push(`×${portion}`)
    const addonLabels = availableAddons
      .filter((a) => addons.includes(a.slug))
      .map((a) => a.label)
    if (addonLabels.length > 0) parts.push(addonLabels.join(' + '))

    return {
      id: nextItemId(),
      name: foodName.trim(),
      kcal: Math.round(kcalNumber),
      detail: parts.join(' · '),
    }
  }

  function clearBuilder() {
    setFoodName('')
    setKcal('')
    setKcalSource('auto')
    setBaseFood(null)
    setPortion(1)
    setAddons([])
  }

  /** เพิ่มเมนูที่กรอกอยู่เข้ามื้อ แล้วล้างฟอร์มให้พร้อมกรอกเมนูถัดไป */
  function handleAddItem() {
    const pending = buildPendingItem()
    if (!pending) {
      setError('กรอกชื่อเมนูกับแคลอรี่ให้ครบก่อนถึงจะเพิ่มได้')
      return
    }
    setItems((prev) => [...prev, pending])
    clearBuilder()
    setError('')
  }

  function handleRemoveItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  async function handleJudge() {
    // เผื่อผู้ใช้กรอกเมนูสุดท้ายแล้วกดตัดสินเลยโดยไม่กด "เพิ่ม"
    const pending = buildPendingItem()
    const finalItems = pending ? [...items, pending] : items

    if (finalItems.length === 0) {
      setError('ยังไม่ได้ใส่เมนูเลยสักอย่าง จะหนีความจริงไปไหน?')
      return
    }

    setItems(finalItems)
    clearBuilder()
    setError('')
    setRoast('')
    setStep('verdict')
  }

  /** เลือกกิจกรรม → ดึงคำด่าของหมวดนั้นมาแสดง */
  async function handlePickActivity(slug: string) {
    setActivitySlug(slug)
    if (!slug) return
    setIsRoasting(true)
    const { getRandomRoast } = await import('../lib/supabase')
    setRoast(await getRandomRoast(slug))
    setIsRoasting(false)
  }

  function handleReset() {
    setStep('food')
    setItems([])
    clearBuilder()
    setRoast('')
    setError('')
    if (!defaultActivitySlug) setActivitySlug('')
  }

  /* ========================== render ========================== */

  if (isBooting) {
    return (
      <section className="mx-auto w-full max-w-2xl">
        <div className="panel-brutal border-steel bg-concrete p-10 text-center">
          <p className="font-display font-black text-neutral-500">กำลังตรวจสอบประวัติอาชญากรรม...</p>
        </div>
      </section>
    )
  }

  return (
    <section
      id="calculator"
      className="mx-auto w-full max-w-2xl scroll-mt-24"
      aria-label="เครื่องคำนวณโทษทัณฑ์แคลอรี่"
    >
      <div className="panel-brutal border-hazard bg-concrete">
        <StepHeader step={step} />

        <div className="p-5 sm:p-8">
          {step === 'profile' && (
            <ProfileForm
              name={name}
              gender={gender}
              height={height}
              weight={weight}
              age={age}
              nameTaunt={nameTaunt}
              ageNote={ageNote}
              isSaving={isSavingProfile}
              isEditing={Boolean(profile)}
              canSubmit={profileReady}
              onNameChange={setName}
              onGenderChange={setGender}
              onHeightChange={setHeight}
              onWeightChange={setWeight}
              onAgeChange={setAge}
              onSubmit={handleSaveProfile}
            />
          )}

          {step === 'food' && body && (
            <FoodForm
              profile={profile!}
              body={body}
              foodName={foodName}
              kcal={kcal}
              kcalSource={kcalSource}
              baseFood={baseFood}
              portion={portion}
              addons={addons}
              availableAddons={availableAddons}
              items={items}
              totalKcal={totalKcal}
              mealBudgetKcal={mealBudget(body)}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
              onFoodNameChange={handleFoodNameChange}
              onSelectFood={handleSelectFood}
              onKcalChange={(v) => {
                setKcal(v)
                setKcalSource('manual')
              }}
              onPortionChange={handlePortionChange}
              onToggleAddon={handleToggleAddon}
              onRestoreAuto={() => baseFood && syncAutoKcal(baseFood, portion, addons)}
              onEditProfile={() => setStep('profile')}
              onSubmit={handleJudge}
            />
          )}

          {step === 'verdict' && body && judgement && (
            <Verdict
              profile={profile!}
              body={body}
              judgement={judgement}
              items={items}
              mealName={mealName}
              kcal={totalKcal}
              activities={activities}
              groupedActivities={groupedActivities}
              activitiesError={activitiesError}
              isLoadingActivities={isLoadingActivities}
              activitySlug={activitySlug}
              selectedActivity={selectedActivity}
              roast={roast}
              isRoasting={isRoasting}
              onPickActivity={handlePickActivity}
              onRetryActivities={() => void loadActivities()}
              onBack={() => setStep('food')}
              onReset={handleReset}
            />
          )}

          {error && (
            <p
              role="alert"
              className="mt-4 animate-shake border-2 border-blood bg-blood/15 px-4 py-3 text-sm font-bold text-red-300"
            >
              ⚠️ {error}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

/* ==========================================================================
 * Header
 * ======================================================================== */

const STEP_TITLE: Record<Step, string> = {
  profile: 'STEP 1 — รายงานตัว',
  food: 'STEP 2 — สารภาพว่ากินอะไร',
  verdict: 'STEP 3 — คำพิพากษา',
}

const STEP_ORDER: Step[] = ['profile', 'food', 'verdict']

function StepHeader({ step }: { step: Step }) {
  const index = STEP_ORDER.indexOf(step)
  return (
    <header>
      <div className="hazard-stripes h-3 w-full" aria-hidden="true" />
      <div className="flex items-center justify-between gap-3 border-b-4 border-hazard bg-void px-5 py-3 sm:px-8">
        <h2 className="font-display text-sm font-black tracking-wider text-hazard sm:text-base">
          {STEP_TITLE[step]}
        </h2>
        <div className="flex gap-1.5" aria-label={`ขั้นตอนที่ ${index + 1} จาก 3`}>
          {STEP_ORDER.map((s, i) => (
            <span
              key={s}
              className={`h-2.5 w-8 ${i <= index ? 'bg-hazard' : 'bg-steel'}`}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    </header>
  )
}

/* ==========================================================================
 * STEP 1 — โปรไฟล์
 * ======================================================================== */

interface ProfileFormProps {
  name: string
  gender: Gender | ''
  height: string
  weight: string
  age: string
  nameTaunt: string | null
  ageNote: { emoji: string; text: string } | null
  isSaving: boolean
  isEditing: boolean
  canSubmit: boolean
  onNameChange: (v: string) => void
  onGenderChange: (v: Gender) => void
  onHeightChange: (v: string) => void
  onWeightChange: (v: string) => void
  onAgeChange: (v: string) => void
  onSubmit: () => void
}

function ProfileForm(p: ProfileFormProps) {
  const bmi = calculateBMI(Number(p.weight), Number(p.height))
  const preview =
    p.gender && Number(p.height) > 0 && Number(p.weight) > 0 && Number(p.age) > 0
      ? calculateTDEE({
          gender: p.gender,
          heightCm: Number(p.height),
          weightKg: Number(p.weight),
          age: Number(p.age),
        })
      : 0

  return (
    <div className="space-y-6">
      <div>
        <p className="font-display text-2xl leading-tight font-black text-white sm:text-3xl">
          {p.isEditing ? 'แก้ข้อมูล' : 'รายงานตัว'}
          <span className="text-blood">ก่อน</span>
        </p>
        <p className="mt-2 text-sm text-neutral-400">
          ต้องรู้ตัวเลขจริงถึงจะคำนวณได้ว่ามื้อไหน "รอด" มื้อไหน "ซวย" — กรอกครั้งเดียว จำให้ตลอด
        </p>
      </div>

      {/* ชื่อ */}
      <div>
        <label htmlFor="p-name" className={labelClass}>
          ชื่อ (ภาษาไทยเท่านั้น)
        </label>
        <input
          id="p-name"
          type="text"
          value={p.name}
          onChange={(e) => p.onNameChange(e.target.value)}
          placeholder="เช่น สมชาย, น้องหมู"
          maxLength={20}
          aria-invalid={Boolean(p.nameTaunt)}
          className={`${inputClass} ${p.nameTaunt ? 'border-blood' : ''}`}
        />
        {p.nameTaunt && (
          <p className="mt-2 animate-shake text-xs font-black text-blood">😤 {p.nameTaunt}</p>
        )}
      </div>

      {/* เพศ */}
      <div>
        <span className={labelClass}>เพศ</span>
        <div className="flex gap-2">
          {GENDERS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => p.onGenderChange(g)}
              aria-pressed={p.gender === g}
              className={`flex-1 border-4 py-3 font-display font-black transition ${
                p.gender === g
                  ? 'border-hazard bg-hazard text-void'
                  : 'border-steel bg-void text-neutral-400 hover:border-hazard hover:text-hazard'
              }`}
            >
              {GENDER_LABEL[g]}
            </button>
          ))}
        </div>
      </div>

      {/* ตัวเลขร่างกาย */}
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField
          id="p-height"
          label="ส่วนสูง"
          unit="ซม."
          value={p.height}
          placeholder="170"
          onChange={p.onHeightChange}
        />
        <NumberField
          id="p-weight"
          label="น้ำหนัก"
          unit="กก."
          value={p.weight}
          placeholder="70"
          onChange={p.onWeightChange}
        />
        <NumberField
          id="p-age"
          label="อายุ"
          unit="ปี"
          value={p.age}
          placeholder="30"
          onChange={p.onAgeChange}
        />
      </div>

      {p.ageNote && (
        <p className="border-l-4 border-hazard bg-hazard/10 px-3 py-2 text-xs font-bold text-hazard">
          {p.ageNote.emoji} {p.ageNote.text}
        </p>
      )}

      {preview > 0 && (
        <div className="border-2 border-steel bg-void px-4 py-3 text-sm">
          <p className="text-neutral-400">
            ร่างกายคุณใช้พลังงานราว{' '}
            <span className="font-display font-black text-hazard">
              {preview.toLocaleString()} แคลอรี่/วัน
            </span>{' '}
            · โควต้าต่อมื้อ{' '}
            <span className="font-display font-black text-white">
              {Math.round(preview / 3).toLocaleString()}
            </span>
          </p>
          {bmi > 0 && (
            <p className="mt-1 text-xs text-neutral-500">
              BMI {bmi} — {BMI_LABEL[getBmiBand(bmi)]} (เกณฑ์เอเชีย)
            </p>
          )}
        </div>
      )}

      <button type="button" onClick={p.onSubmit} disabled={!p.canSubmit || p.isSaving} className={primaryButtonClass}>
        {p.isSaving ? 'กำลังบันทึก...' : p.isEditing ? 'บันทึกการแก้ไข' : 'รายงานตัวเสร็จ → ไปต่อ'}
      </button>
    </div>
  )
}

function NumberField({
  id,
  label,
  unit,
  value,
  placeholder,
  onChange,
}: {
  id: string
  label: string
  unit: string
  value: string
  placeholder: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputClass} pr-12`}
        />
        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold text-neutral-500">
          {unit}
        </span>
      </div>
    </div>
  )
}

/* ==========================================================================
 * STEP 2 — อาหาร
 * ======================================================================== */

interface FoodFormProps {
  profile: Profile
  body: BodyProfile
  foodName: string
  kcal: string
  kcalSource: KcalSource
  baseFood: FoodItem | null
  portion: number
  addons: string[]
  availableAddons: FoodAddon[]
  items: MealItem[]
  totalKcal: number
  mealBudgetKcal: number
  onAddItem: () => void
  onRemoveItem: (id: string) => void
  onFoodNameChange: (v: string) => void
  onSelectFood: (f: FoodItem) => void
  onKcalChange: (v: string) => void
  onPortionChange: (v: number) => void
  onToggleAddon: (slug: string) => void
  onRestoreAuto: () => void
  onEditProfile: () => void
  onSubmit: () => void
}

function FoodForm(p: FoodFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const suggestions = useMemo(() => searchFoods(p.foodName), [p.foodName])
  const showList = isOpen && suggestions.length > 0

  useEffect(() => setHighlight(-1), [p.foodName])

  const canSubmit = p.foodName.trim().length > 0 && Number(p.kcal) > 0
  const autoKcal = p.baseFood ? computeFoodKcal(p.baseFood, p.portion, p.addons) : null
  const isOverridden = p.kcalSource === 'manual' && autoKcal !== null && Number(p.kcal) !== autoKcal
  const activeAddonLabels = p.availableAddons
    .filter((a) => p.addons.includes(a.slug))
    .map((a) => a.label)
    .join(' + ')

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIsOpen(true)
      setHighlight((h) => (h + 1) % Math.max(suggestions.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1))
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'Enter') {
      if (showList && highlight >= 0) {
        e.preventDefault()
        p.onSelectFood(suggestions[highlight]!)
        setIsOpen(false)
      } else if (canSubmit) {
        p.onSubmit()
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* แถบโปรไฟล์ */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-steel bg-void px-3 py-2 text-xs">
        <span className="font-bold text-neutral-300">
          👤 {p.profile.nickname} · {GENDER_LABEL[p.body.gender]} · {p.body.weightKg} กก. ·{' '}
          {p.body.age} ปี
        </span>
        <button
          type="button"
          onClick={p.onEditProfile}
          className="font-bold text-neutral-500 underline underline-offset-2 hover:text-hazard"
        >
          แก้ข้อมูล
        </button>
      </div>

      <div>
        <p className="font-display text-2xl leading-tight font-black text-white sm:text-3xl">
          เมื่อกี้<span className="text-blood">ยัดอะไรเข้าไป</span>?
        </p>
        <p className="mt-2 text-sm text-neutral-400">
          พิมพ์ชื่อเมนู เดี๋ยวเติมแคลอรี่ให้เอง — สั่งพิเศษก็พิมพ์ติดมาได้เลย
        </p>
      </div>

      {/* ชื่ออาหาร + autocomplete */}
      <div>
        <label htmlFor="food-name" className={labelClass}>
          ชื่ออาหาร
        </label>
        <div className="relative">
          <input
            id="food-name"
            type="text"
            role="combobox"
            aria-expanded={showList}
            aria-controls="food-suggestions"
            aria-autocomplete="list"
            autoComplete="off"
            value={p.foodName}
            onChange={(e) => {
              p.onFoodNameChange(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setIsOpen(false)}
            onKeyDown={handleKeyDown}
            placeholder="เช่น ข้าวกะเพราพิเศษ ไข่ดาว"
            maxLength={80}
            className={inputClass}
          />

          {showList && (
            <ul
              id="food-suggestions"
              role="listbox"
              onMouseDown={(e) => e.preventDefault()}
              className="absolute top-full right-0 left-0 z-20 max-h-64 overflow-y-auto border-4 border-t-0 border-hazard bg-void shadow-2xl"
            >
              {suggestions.map((food, index) => (
                <li key={food.slug}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === highlight}
                    onClick={() => {
                      p.onSelectFood(food)
                      setIsOpen(false)
                    }}
                    onMouseEnter={() => setHighlight(index)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
                      index === highlight ? 'bg-hazard text-void' : 'text-white hover:bg-steel'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-bold">
                        {food.emoji} {food.name}
                      </span>
                      <span
                        className={`block truncate text-xs ${index === highlight ? 'text-void/70' : 'text-neutral-500'}`}
                      >
                        {food.serving}
                      </span>
                    </span>
                    <span className="shrink-0 font-black">{food.kcal.toLocaleString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* จำนวนหน่วย */}
      {p.baseFood && (
        <div>
          <span className={labelClass}>กินไปกี่หน่วย? ({p.baseFood.serving})</span>
          <div className="flex flex-wrap gap-2">
            {PORTION_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => p.onPortionChange(option)}
                aria-pressed={p.portion === option}
                className={`min-w-14 border-2 px-3 py-1.5 text-sm font-black transition ${
                  p.portion === option
                    ? 'border-hazard bg-hazard text-void'
                    : 'border-steel bg-void text-neutral-300 hover:border-hazard hover:text-hazard'
                }`}
              >
                ×{option}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ของเพิ่ม */}
      {p.baseFood && p.availableAddons.length > 0 && (
        <div>
          <span className={labelClass}>สั่งเพิ่มอะไรอีกไหม?</span>
          <div className="flex flex-wrap gap-2">
            {p.availableAddons.map((addon) => {
              const isActive = p.addons.includes(addon.slug)
              const isDiscount = (addon.multiplier ?? 1) < 1 || (addon.kcal ?? 0) < 0
              return (
                <button
                  key={addon.slug}
                  type="button"
                  onClick={() => p.onToggleAddon(addon.slug)}
                  aria-pressed={isActive}
                  className={`border-2 px-3 py-1.5 text-xs font-black transition ${
                    isActive
                      ? isDiscount
                        ? 'border-emerald-400 bg-emerald-400 text-void'
                        : 'border-blood bg-blood text-white'
                      : 'border-steel bg-void text-neutral-300 hover:border-hazard hover:text-hazard'
                  }`}
                >
                  {isActive ? '✓ ' : ''}
                  {addon.emoji} {addon.label}
                  <span className="ml-1 text-[10px] opacity-70">{addon.hint}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* แคลอรี่ */}
      <div>
        <label htmlFor="food-kcal" className={labelClass}>
          แคลอรี่ (kcal)
        </label>
        <div className="relative">
          <input
            id="food-kcal"
            type="number"
            inputMode="numeric"
            value={p.kcal}
            onChange={(e) => p.onKcalChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canSubmit && p.onSubmit()}
            placeholder="พิมพ์ชื่อเมนูข้างบน แล้วเลขจะขึ้นเอง"
            className={`${inputClass} pr-16`}
          />
          <span className="absolute top-1/2 right-4 -translate-y-1/2 text-sm font-bold text-neutral-500">
            kcal
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {p.kcalSource === 'auto' && p.baseFood && (
            <span className="font-bold text-hazard">
              ⚡ เติมให้จาก “{p.baseFood.name}”
              {p.portion !== 1 && ` ×${p.portion}`}
              {activeAddonLabels && ` + ${activeAddonLabels}`} — แก้ทับได้
            </span>
          )}
          {p.kcalSource === 'manual' && (
            <span className="font-bold text-neutral-400">✍️ ตัวเลขที่คุณกรอกเอง</span>
          )}
          {isOverridden && (
            <button
              type="button"
              onClick={p.onRestoreAuto}
              className="font-bold text-neutral-500 underline underline-offset-2 hover:text-hazard"
            >
              คืนค่าอัตโนมัติ ({autoKcal!.toLocaleString()})
            </button>
          )}
        </div>
      </div>

      {/* ปุ่มลัด */}
      <div>
        <p className="mb-2 text-xs font-bold tracking-wider text-neutral-500 uppercase">
          หรือกดเลือกตัวการยอดฮิต
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_PICK_FOODS.map((food) => (
            <button
              key={food.slug}
              type="button"
              onClick={() => p.onSelectFood(food)}
              className={`border-2 px-3 py-1.5 text-xs font-bold transition ${
                p.baseFood?.slug === food.slug
                  ? 'border-hazard bg-hazard/15 text-hazard'
                  : 'border-steel bg-void text-neutral-300 hover:border-hazard hover:text-hazard'
              }`}
            >
              {food.emoji} {food.name}
              <span className="ml-1 text-neutral-500">{food.kcal}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ---------- มื้อนี้มีอะไรบ้าง ---------- */}
      {(p.items.length > 0 || canSubmit) && (
        <div className="border-4 border-steel bg-void p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-black tracking-wider text-hazard uppercase">
              มื้อนี้กินไปแล้ว {p.items.length} อย่าง
            </p>
            <p className="font-display text-lg font-black text-white">
              {p.totalKcal.toLocaleString()}
              <span className="ml-1 text-xs font-bold text-neutral-500">
                / {p.mealBudgetKcal.toLocaleString()} kcal
              </span>
            </p>
          </div>

          {p.items.length > 0 ? (
            <ul className="space-y-2">
              {p.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 border-2 border-steel bg-concrete px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-white">{item.name}</span>
                    {item.detail && (
                      <span className="block truncate text-[11px] text-neutral-500">
                        {item.detail}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-display font-black text-hazard">
                      {item.kcal.toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => p.onRemoveItem(item.id)}
                      aria-label={`เอา ${item.name} ออก`}
                      className="border-2 border-steel px-2 py-0.5 text-xs font-black text-neutral-500 transition hover:border-blood hover:text-blood"
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-neutral-500">
              ยังไม่ได้กด "เพิ่ม" — กดตัดสินเลยก็ได้ ระบบจะนับเมนูที่กรอกอยู่ให้อัตโนมัติ
            </p>
          )}

          {/* แถบเทียบโควต้าแบบเรียลไทม์ */}
          <div className="mt-3 h-2 w-full border border-steel bg-void">
            <div
              className={`h-full transition-all ${
                p.totalKcal <= p.mealBudgetKcal ? 'bg-emerald-400' : 'bg-blood'
              }`}
              style={{ width: `${Math.min(100, (p.totalKcal / Math.max(p.mealBudgetKcal, 1)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={p.onAddItem}
          disabled={!canSubmit}
          className="border-4 border-steel px-5 py-4 font-display font-black text-neutral-300 transition hover:border-hazard hover:text-hazard disabled:cursor-not-allowed disabled:text-neutral-600"
        >
          ➕ เพิ่มอีกเมนู
        </button>
        <button
          type="button"
          onClick={p.onSubmit}
          disabled={!canSubmit && p.items.length === 0}
          className={`${primaryButtonClass} flex-1`}
        >
          ตัดสินโทษ 🔨
        </button>
      </div>
    </div>
  )
}

/** ย่อรายชื่อเมนูให้อยู่ในความยาวที่คอลัมน์ food_name รับได้ (80 ตัวอักษร) */
function summariseMeal(items: MealItem[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]!.name

  const joined = items.map((i) => i.name).join(' + ')
  if (joined.length <= 70) return joined

  return `${items[0]!.name} + อีก ${items.length - 1} อย่าง`
}

/* ==========================================================================
 * STEP 3 — คำพิพากษา
 * ======================================================================== */

interface VerdictProps {
  profile: Profile
  body: BodyProfile
  judgement: MealJudgement
  items: MealItem[]
  mealName: string
  kcal: number
  activities: Activity[]
  groupedActivities: { group: ActivityGroup; label: string; items: Activity[] }[]
  activitiesError: string | null
  isLoadingActivities: boolean
  activitySlug: string
  selectedActivity: Activity | null
  roast: string
  isRoasting: boolean
  onPickActivity: (slug: string) => void
  onRetryActivities: () => void
  onBack: () => void
  onReset: () => void
}

function Verdict(p: VerdictProps) {
  const { verdict, budget, excess, percent } = p.judgement

  // จำคำจิกกัดไว้ ไม่ให้สุ่มใหม่ทุกครั้งที่ re-render
  const taunt = useMemo(
    () => pickTaunt(verdict === 'safe' ? SAFE_TAUNTS : verdict === 'warn' ? WARN_TAUNTS : DANGER_TAUNTS),
    [verdict, p.kcal],
  )

  // สุ่มครั้งเดียวต่อรอบการตัดสิน ไม่ให้ข้อความสลับไปมาทุกครั้งที่ re-render
  const noActivityMeme = useMemo(() => pickTaunt(NO_ACTIVITY_MEMES), [p.kcal])
  const sandbagMeme = useMemo(() => pickTaunt(SANDBAG_MEMES), [p.activitySlug])

  const isSafe = verdict === 'safe'
  const debtKcal = isSafe ? 0 : excess

  const minutes = p.selectedActivity
    ? calculateBurnTime(debtKcal, p.body.weightKg, p.selectedActivity.mets)
    : 0
  const wholeMealMinutes = p.selectedActivity
    ? calculateBurnTime(p.kcal, p.body.weightKg, p.selectedActivity.mets)
    : 0

  return (
    <div className="space-y-6">
      {/* สรุปมื้อนี้ */}
      <div className="text-center">
        <p className="text-sm text-neutral-400">
          {p.mealName} ·{' '}
          <span className="font-bold text-white">{p.kcal.toLocaleString()} kcal</span>
        </p>
        {p.items.length > 1 && (
          <ul className="mx-auto mt-2 flex max-w-md flex-wrap justify-center gap-1.5">
            {p.items.map((item) => (
              <li
                key={item.id}
                className="border border-steel bg-void px-2 py-0.5 text-[11px] text-neutral-400"
              >
                {item.name} <span className="font-bold text-neutral-300">{item.kcal}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-xs text-neutral-500">
          โควต้าต่อมื้อของคุณ {budget.toLocaleString()} kcal (มาตรฐาน{GENDER_LABEL[p.body.gender]}ไทย{' '}
          {THAI_RDI[p.body.gender].toLocaleString()}/วัน)
        </p>
      </div>

      {/* แถบเทียบโควต้า */}
      <div>
        <div className="mb-1 flex justify-between text-xs font-black">
          <span className={isSafe ? 'text-emerald-400' : 'text-blood'}>{percent}% ของโควต้า</span>
          {excess > 0 && <span className="text-blood">เกินมา {excess.toLocaleString()} kcal</span>}
        </div>
        <div className="h-4 w-full border-2 border-steel bg-void">
          <div
            className={`h-full transition-all ${isSafe ? 'bg-emerald-400' : verdict === 'warn' ? 'bg-hazard' : 'bg-blood'}`}
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>
      </div>

      {isSafe ? (
        /* ---------- รอด: นอนเฉยๆ ได้ ---------- */
        <div className="border-4 border-emerald-400 bg-emerald-400/10 p-6 text-center">
          <p className="font-display text-4xl font-black text-emerald-400 sm:text-5xl">
            😴 นอนเฉยๆ ได้
          </p>
          <p className="mt-3 font-display text-lg leading-snug font-black text-white">“{taunt}”</p>
          <p className="mt-3 text-xs text-neutral-400">
            เหลือโควต้าอีก {(budget - p.kcal).toLocaleString()} kcal ในมื้อนี้
          </p>
        </div>
      ) : (
        /* ---------- ซวย: ต้องชดใช้ ---------- */
        <>
          <div
            className={`${verdict === 'danger' ? 'danger-stripes animate-siren' : 'hazard-stripes'} p-1`}
          >
            <div className="bg-void px-4 py-6 text-center">
              <p className="text-xs font-black tracking-[0.2em] text-neutral-400 uppercase">
                ต้องเผาผลาญคืน
              </p>
              <p
                className={`font-display text-stencil my-1 text-5xl font-black ${verdict === 'danger' ? 'text-blood' : 'text-hazard'}`}
              >
                {excess.toLocaleString()} kcal
              </p>
              <p className="font-display text-sm font-black text-white">“{taunt}”</p>
            </div>
          </div>

          {/* เลือกวิธีชดใช้ */}
          <div>
            <label htmlFor="activity" className={labelClass}>
              เลือกวิธีไถ่บาป
            </label>

            {p.activitiesError && p.groupedActivities.length === 0 ? (
              <div className="border-4 border-blood bg-blood/10 p-4">
                <p className="font-display text-sm font-black text-red-300">
                  ⚠️ โหลดรายการกิจกรรมไม่ได้
                </p>
                <p className="mt-1 text-xs text-neutral-300">{p.activitiesError}</p>
                <button
                  type="button"
                  onClick={p.onRetryActivities}
                  disabled={p.isLoadingActivities}
                  className="mt-3 border-2 border-blood px-3 py-1.5 text-xs font-black text-red-300 transition hover:bg-blood hover:text-white disabled:opacity-50"
                >
                  {p.isLoadingActivities ? 'กำลังลองใหม่...' : 'ลองโหลดใหม่'}
                </button>
              </div>
            ) : (
              <select
                id="activity"
                value={p.activitySlug}
                onChange={(e) => p.onPickActivity(e.target.value)}
                disabled={p.isLoadingActivities}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="">
                  {p.isLoadingActivities ? 'กำลังโหลด...' : '— เลือกกิจกรรม —'}
                </option>
                {p.groupedActivities.map(({ group, label, items }) => (
                  <optgroup key={group} label={label}>
                    {items.map((a) => (
                      <option key={a.slug} value={a.slug}>
                        {a.emoji} {a.name_th} (METs {a.mets})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>

          {/* ยังไม่เลือก → แซวด้วยมีมแซนด์แบ็ก */}
          {!p.selectedActivity && !p.activitiesError && (
            <p className="border-l-4 border-hazard bg-hazard/10 px-4 py-3 text-sm font-bold text-hazard">
              🎒 {noActivityMeme}
            </p>
          )}

          {/* ผลลัพธ์เวลา */}
          {p.selectedActivity && (
            <div className="border-4 border-blood bg-concrete p-5 text-center">
              <p className="text-xs font-black tracking-widest text-neutral-400 uppercase">
                {p.selectedActivity.emoji} {p.selectedActivity.name_th}
              </p>
              <p className="font-display text-stencil my-1 text-5xl font-black text-blood sm:text-6xl">
                {formatDuration(minutes)}
              </p>
              <p className="text-sm font-bold text-neutral-300">
                ระดับความซวย: {SEVERITY_LABEL[getSeverityLevel(minutes)]}
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                (ถ้าจะเผาทั้งมื้อ {p.kcal.toLocaleString()} kcal ต้องใช้{' '}
                {formatDuration(wholeMealMinutes)})
              </p>

              {p.isRoasting ? (
                <p className="mt-4 text-sm text-neutral-500">กำลังคิดคำด่า...</p>
              ) : (
                p.roast && (
                  <blockquote className="mt-4 border-l-8 border-blood bg-blood/10 px-4 py-4 text-left">
                    <p className="font-display text-lg leading-snug font-black text-white">
                      “{p.roast}”
                    </p>
                  </blockquote>
                )
              )}

              {p.selectedActivity.slug === HYROX_SLUG && (
                <p className="mt-4 border-2 border-dashed border-hazard bg-void px-4 py-3 text-left text-sm font-bold text-hazard">
                  🎒 {sandbagMeme}
                </p>
              )}

              <SaveToBoard
                profile={p.profile}
                foodName={p.mealName}
                kcal={p.kcal}
                activitySlug={p.selectedActivity.slug}
                minutes={minutes}
              />
            </div>
          )}
        </>
      )}

      {/* โฆษณาวางใต้คำด่า — จุดที่สายตาหยุดอยู่นานที่สุดของทั้งหน้า */}
      <AdPlaceholder
        adSlot={AD_SLOTS.verdictRectangle}
        format="rectangle"
        disabled={!isAdAllowed(p.selectedActivity?.slug)}
      />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={p.onBack}
          className="border-4 border-steel px-5 py-4 font-display font-black text-neutral-400 transition hover:border-neutral-500 hover:text-white"
        >
          ← แก้
        </button>
        <button type="button" onClick={p.onReset} className={`${primaryButtonClass} flex-1`}>
          เริ่มมื้อใหม่
        </button>
      </div>
    </div>
  )
}

/* ==========================================================================
 * บันทึกหนี้ลงบอร์ด
 * ======================================================================== */

function SaveToBoard({
  profile,
  foodName,
  kcal,
  activitySlug,
  minutes,
}: {
  profile: Profile
  foodName: string
  kcal: number
  activitySlug: string
  minutes: number
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [saveError, setSaveError] = useState('')

  // เปลี่ยนกิจกรรมแล้วให้บันทึกใหม่ได้
  useEffect(() => {
    setState('idle')
    setSaveError('')
  }, [activitySlug])

  async function handleSave() {
    setState('saving')
    const { logBurn } = await import('../lib/profile')
    const { error } = await logBurn({
      profileId: profile.id,
      foodName,
      kcal,
      activitySlug,
      minutes,
    })

    if (error) {
      setSaveError(error)
      setState('idle')
      return
    }
    setState('saved')
  }

  if (state === 'saved') {
    return (
      <div className="mt-4 border-2 border-hazard bg-hazard/10 p-3 text-left">
        <p className="text-sm font-black text-hazard">✅ บันทึกหนี้ลงบอร์ดแล้ว</p>
        <a
          href="/rank"
          className="mt-2 inline-block text-xs font-black text-hazard underline underline-offset-2"
        >
          ไปกด “ชดใช้แล้ว” ที่หน้าอันดับ →
        </a>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleSave}
        disabled={state === 'saving'}
        className="w-full border-2 border-hazard px-4 py-3 font-display font-black text-hazard transition hover:bg-hazard hover:text-void disabled:opacity-50"
      >
        {state === 'saving' ? 'กำลังบันทึก...' : '📌 บันทึกหนี้ลงบอร์ดจัดอันดับ'}
      </button>
      {saveError && <p className="mt-2 text-xs font-bold text-red-400">⚠️ {saveError}</p>}
    </div>
  )
}

/* ==========================================================================
 * Shared styles
 * ======================================================================== */

const labelClass = 'mb-2 block text-xs font-black tracking-wider text-hazard uppercase'

const inputClass =
  'w-full border-4 border-steel bg-void px-4 py-4 font-display text-lg font-bold text-white outline-none transition placeholder:text-sm placeholder:font-normal placeholder:text-neutral-600 focus:border-hazard'

const primaryButtonClass =
  'w-full border-4 border-void bg-hazard px-5 py-4 font-display text-lg font-black text-void transition hover:bg-white disabled:cursor-not-allowed disabled:bg-steel disabled:text-neutral-600'
