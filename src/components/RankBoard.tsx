/**
 * RankBoard.tsx — หน้าจัดอันดับ + ยศ (React Island)
 *
 * 3 แท็บ: หอเกียรติยศ / บอร์ดประจาน / หนี้ของฉัน
 * ตัวตนไม่ต้องล็อกอิน — ผูกกับ device_id ใน localStorage
 */

import { useCallback, useEffect, useState } from 'react'
import {
  getHallOfFame,
  getMyLogs,
  getMyProfile,
  getWallOfShame,
  settleBurnLog,
} from '../lib/profile'
import {
  SHAME_THRESHOLD_MINUTES,
  formatStreak,
  getRank,
  getRankProgress,
  getShameTier,
} from '../lib/ranks'
import { formatDuration, formatDurationShort } from '../lib/calculator'
import type { BurnLog, LeaderboardRow, Profile } from '../lib/types'

type Tab = 'fame' | 'shame' | 'mine'

export default function RankBoard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fame, setFame] = useState<LeaderboardRow[]>([])
  const [shame, setShame] = useState<LeaderboardRow[]>([])
  const [logs, setLogs] = useState<BurnLog[]>([])

  const [tab, setTab] = useState<Tab>('fame')
  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const [me, fameResult, shameResult] = await Promise.all([
      getMyProfile(),
      getHallOfFame(),
      getWallOfShame(),
    ])

    setProfile(me)
    setFame(fameResult.data)
    setShame(shameResult.data)
    setError(fameResult.error ?? shameResult.error ?? '')

    if (me) setLogs(await getMyLogs(me.id))
  }, [])

  useEffect(() => {
    void refresh().finally(() => setIsLoading(false))
  }, [refresh])

  async function handleSettle(logId: string) {
    setIsBusy(true)
    const { error: settleError } = await settleBurnLog(logId)
    setIsBusy(false)

    if (settleError) {
      setError(settleError)
      return
    }

    setError('')
    await refresh()
  }

  if (isLoading) {
    return <p className="py-16 text-center font-display font-black text-neutral-500">กำลังโหลดบอร์ด...</p>
  }

  const pendingLogs = logs.filter((log) => log.status === 'pending')

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      {/* ---------- การ์ดยศของฉัน ---------- */}
      {profile ? <MyRankCard profile={profile} pendingCount={pendingLogs.length} /> : <RegisterCard />}

      {error && (
        <p
          role="alert"
          className="border-2 border-blood bg-blood/15 px-4 py-3 text-sm font-bold text-red-300"
        >
          ⚠️ {error}
        </p>
      )}

      {/* ---------- แท็บ ---------- */}
      <div className="flex border-4 border-steel">
        {(
          [
            { key: 'fame', label: '🏆 หอเกียรติยศ' },
            { key: 'shame', label: '📢 บอร์ดประจาน' },
            { key: 'mine', label: `🧾 หนี้ของฉัน${pendingLogs.length ? ` (${pendingLogs.length})` : ''}` },
          ] as { key: Tab; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`flex-1 px-2 py-3 text-xs font-black transition sm:text-sm ${
              tab === key ? 'bg-hazard text-void' : 'bg-void text-neutral-400 hover:text-hazard'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'fame' && <FameTable rows={fame} myId={profile?.id} />}
      {tab === 'shame' && <ShameTable rows={shame} myId={profile?.id} />}
      {tab === 'mine' && (
        <MyDebts logs={logs} hasProfile={Boolean(profile)} isBusy={isBusy} onSettle={handleSettle} />
      )}
    </div>
  )
}

/* ==========================================================================
 * การ์ดยศ
 * ======================================================================== */

function MyRankCard({ profile, pendingCount }: { profile: Profile; pendingCount: number }) {
  const { current, next, remainingMinutes, percent } = getRankProgress(profile.total_paid_minutes)
  const shame = getShameTier(profile.debt_minutes)

  return (
    <section className="panel-brutal border-hazard bg-concrete">
      <div className="hazard-stripes h-3 w-full" aria-hidden="true" />

      <div className="space-y-5 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-widest text-neutral-500 uppercase">ยศปัจจุบัน</p>
            <p className={`font-display text-2xl font-black sm:text-3xl ${current.color}`}>
              {current.emoji} {current.title}
            </p>
            <p className="mt-1 text-sm text-neutral-400">“{current.taunt}”</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black tracking-widest text-neutral-500 uppercase">ชื่อบนบอร์ด</p>
            <p className="font-display text-lg font-black text-white">{profile.nickname}</p>
          </div>
        </div>

        {/* ความคืบหน้าไปยศถัดไป */}
        {next ? (
          <div>
            <div className="mb-1.5 flex justify-between text-xs font-bold">
              <span className="text-neutral-400">
                อีก {formatDuration(remainingMinutes)} จะได้ยศ {next.emoji} {next.title}
              </span>
              <span className="text-hazard">{percent}%</span>
            </div>
            <div className="h-3 w-full border-2 border-steel bg-void">
              <div className="h-full bg-hazard transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
        ) : (
          <p className="border-2 border-blood bg-blood/10 px-4 py-2 text-sm font-black text-blood">
            👑 ยศสูงสุดแล้ว ไม่มีอะไรจะให้ไต่อีก
          </p>
        )}

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="ชดใช้แล้ว" value={formatDurationShort(profile.total_paid_minutes)} tone="good" />
          <Stat label="หนี้ค้าง" value={formatDurationShort(profile.debt_minutes)} tone="bad" />
          <Stat label="สตรีค" value={formatStreak(profile.current_streak)} />
          <Stat label="รายการค้าง" value={`${pendingCount} รายการ`} />
        </dl>

        {profile.debt_minutes >= SHAME_THRESHOLD_MINUTES && (
          <p className="danger-stripes animate-siren p-1">
            <span className="block bg-void px-4 py-3 text-sm font-black text-red-300">
              {shame.emoji} ยศประจาน: {shame.title} — {shame.taunt}
            </span>
          </p>
        )}
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'good' | 'bad' | 'neutral'
}) {
  const color =
    tone === 'good' ? 'text-hazard' : tone === 'bad' ? 'text-blood' : 'text-white'
  return (
    <div className="border-2 border-steel bg-void px-3 py-2">
      <dt className="text-[10px] font-black tracking-wider text-neutral-500 uppercase">{label}</dt>
      <dd className={`font-display text-base font-black ${color}`}>{value}</dd>
    </div>
  )
}

/* ==========================================================================
 * สมัครขึ้นบอร์ด
 * ======================================================================== */

function RegisterCard() {
  return (
    <section className="panel-brutal border-hazard bg-concrete">
      <div className="hazard-stripes h-3 w-full" aria-hidden="true" />
      <div className="space-y-4 p-5 sm:p-7">
        <h2 className="font-display text-2xl font-black text-white sm:text-3xl">
          ยัง<span className="text-hazard">ไม่ได้รายงานตัว</span>
        </h2>
        <p className="text-sm text-neutral-400">
          ต้องกรอกชื่อกับข้อมูลร่างกายที่หน้าเครื่องคำนวณก่อน ระบบถึงจะรู้ว่าโควต้าต่อมื้อของคุณเท่าไหร่
          และคุณเบี้ยวหนี้ไปเท่าไหร่แล้ว
        </p>
        <a
          href="/#calculator"
          className="inline-block border-4 border-void bg-hazard px-6 py-4 font-display text-lg font-black text-void transition hover:bg-white"
        >
          ไปรายงานตัว →
        </a>
        <p className="text-xs text-neutral-600">
          ไม่ต้องล็อกอิน ไม่ต้องใส่อีเมล — ตัวตนผูกกับเบราว์เซอร์เครื่องนี้
        </p>
      </div>
    </section>
  )
}

/* ==========================================================================
 * ตารางอันดับ
 * ======================================================================== */

const MEDALS = ['🥇', '🥈', '🥉']

function FameTable({ rows, myId }: { rows: LeaderboardRow[]; myId?: string }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="ยังไม่มีใครขึ้นหอเกียรติยศ"
        detail="ตำแหน่งที่ 1 ยังว่างอยู่ ไปออกกำลังกายแล้วกดชดใช้ซะ"
      />
    )
  }

  return (
    <div className="overflow-x-auto border-4 border-steel">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-hazard text-void">
          <tr>
            <th scope="col" className="px-3 py-3 font-black">#</th>
            <th scope="col" className="px-3 py-3 font-black">ชื่อ</th>
            <th scope="col" className="px-3 py-3 font-black">ยศ</th>
            <th scope="col" className="px-3 py-3 text-right font-black">ชดใช้แล้ว</th>
            <th scope="col" className="px-3 py-3 text-right font-black">สตรีค</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rank = getRank(row.total_paid_minutes)
            return (
              <tr
                key={row.id}
                className={`border-t-2 border-steel ${
                  row.id === myId ? 'bg-hazard/15' : 'odd:bg-concrete'
                }`}
              >
                <td className="px-3 py-3 font-black text-neutral-500">
                  {MEDALS[index] ?? index + 1}
                </td>
                <th scope="row" className="px-3 py-3 text-left font-bold text-white">
                  {row.nickname}
                  {row.id === myId && <span className="ml-1 text-xs text-hazard">(คุณ)</span>}
                </th>
                <td className={`px-3 py-3 font-bold whitespace-nowrap ${rank.color}`}>
                  {rank.emoji} {rank.title}
                </td>
                <td className="px-3 py-3 text-right font-black whitespace-nowrap text-hazard">
                  {formatDurationShort(row.total_paid_minutes)}
                </td>
                <td className="px-3 py-3 text-right font-bold whitespace-nowrap text-neutral-400">
                  {row.current_streak > 0 ? `${row.current_streak} วัน` : '-'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ShameTable({ rows, myId }: { rows: LeaderboardRow[]; myId?: string }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="บอร์ดประจานว่างเปล่า"
        detail={`ยังไม่มีใครค้างเกิน ${SHAME_THRESHOLD_MINUTES} นาที น่าประทับใจ... หรือยังไม่มีใครกล้าบันทึกกันแน่?`}
      />
    )
  }

  return (
    <div className="danger-stripes p-1">
      <div className="overflow-x-auto bg-void">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-blood text-white">
            <tr>
              <th scope="col" className="px-3 py-3 font-black">#</th>
              <th scope="col" className="px-3 py-3 font-black">ผู้ต้องหา</th>
              <th scope="col" className="px-3 py-3 font-black">ข้อหา</th>
              <th scope="col" className="px-3 py-3 text-right font-black">หนี้ค้าง</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const shame = getShameTier(row.debt_minutes)
              return (
                <tr
                  key={row.id}
                  className={`border-t-2 border-steel ${
                    row.id === myId ? 'bg-blood/20' : 'odd:bg-concrete'
                  }`}
                >
                  <td className="px-3 py-3 font-black text-neutral-500">{index + 1}</td>
                  <th scope="row" className="px-3 py-3 text-left font-bold text-white">
                    {row.nickname}
                    {row.id === myId && <span className="ml-1 text-xs text-blood">(คุณ)</span>}
                  </th>
                  <td className="px-3 py-3 font-bold whitespace-nowrap text-red-300">
                    {shame.emoji} {shame.title}
                  </td>
                  <td className="px-3 py-3 text-right font-black whitespace-nowrap text-blood">
                    {formatDurationShort(row.debt_minutes)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ==========================================================================
 * หนี้ของฉัน
 * ======================================================================== */

function MyDebts({
  logs,
  hasProfile,
  isBusy,
  onSettle,
}: {
  logs: BurnLog[]
  hasProfile: boolean
  isBusy: boolean
  onSettle: (id: string) => void
}) {
  if (!hasProfile) {
    return <EmptyState title="ยังไม่ได้ตั้งชื่อ" detail="ตั้งชื่อเล่นข้างบนก่อน ถึงจะเริ่มบันทึกหนี้ได้" />
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        title="ยังไม่มีรายการ"
        detail="ไปหน้าแรก คำนวณโทษ แล้วกด “บันทึกหนี้ลงบอร์ด” เพื่อเริ่มนับ"
      />
    )
  }

  return (
    <ul className="space-y-3">
      {logs.map((log) => {
        const isPaid = log.status === 'paid'
        return (
          <li
            key={log.id}
            className={`flex flex-wrap items-center justify-between gap-3 border-4 p-4 ${
              isPaid ? 'border-steel bg-concrete opacity-60' : 'border-blood bg-blood/10'
            }`}
          >
            <div className="min-w-0">
              <p className="truncate font-display font-black text-white">
                {log.food_name}{' '}
                <span className="text-sm font-bold text-neutral-500">
                  {log.kcal.toLocaleString()} kcal
                </span>
              </p>
              <p className="text-xs text-neutral-400">
                {new Date(log.logged_at).toLocaleDateString('th-TH', {
                  day: 'numeric',
                  month: 'short',
                })}{' '}
                · ต้องออกกำลังกาย {formatDuration(log.minutes)}
              </p>
            </div>

            {isPaid ? (
              <span className="shrink-0 border-2 border-steel px-3 py-1.5 text-xs font-black text-neutral-500">
                ✅ ชดใช้แล้ว
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onSettle(log.id)}
                disabled={isBusy}
                className="shrink-0 border-2 border-hazard bg-hazard px-3 py-1.5 text-xs font-black text-void transition hover:bg-white disabled:opacity-50"
              >
                ชดใช้แล้ว ✓
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="border-4 border-dashed border-steel p-8 text-center">
      <p className="font-display text-lg font-black text-neutral-400">{title}</p>
      <p className="mt-1 text-sm text-neutral-500">{detail}</p>
    </div>
  )
}
