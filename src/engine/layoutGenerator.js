import { MAIN_LIFTS } from './exercises.js'

const PHASE = { squat: 0, bench: 1, deadlift: 2 }   // 종목 간 요일 오프셋(분산)

// f회를 D일 canvas에 균등·distinct 배치. f<=D면 floor(i*D/f) 강증가→distinct,
// (phase + .) % D는 bijection이라 distinct 보존. 결정론.
export function distinctDays(f, D, phase) {
  const days = []
  for (let i = 0; i < f; i++) days.push((phase + Math.floor((i * D) / f)) % D)
  return days
}

// 첫 세션 heavy(comp), 이후 volume/light 교대(variation).
function roleFor(i) {
  if (i === 0) return 'heavy'
  return i % 2 === 1 ? 'volume' : 'light'
}

// 축성피로 스택 가드: 대체 요일이 있을 때 heavy 스쿼트·데드 동일 요일 배치 방지.
// byDay를 in-place 수정. 대체 불가(요일 부족)면 그대로 허용. 결정론 (Date.now/Math.random 없음).
function applyAxialGuard(byDay, D) {
  let sqHeavyDay = -1, dlHeavyDay = -1
  for (const [day, slots] of byDay) {
    for (const s of slots) {
      if (s.lift === 'squat' && s.role === 'heavy') sqHeavyDay = day
      if (s.lift === 'deadlift' && s.role === 'heavy') dlHeavyDay = day
    }
  }
  if (sqHeavyDay === -1 || dlHeavyDay === -1 || sqHeavyDay !== dlHeavyDay) return

  // 충돌 감지 — deadlift heavy를 다른 요일로 이전 시도 (0..D-1 오름차순 결정론)
  const conflictDay = dlHeavyDay
  const dlOccupied = new Set(
    [...byDay.entries()]
      .filter(([, slots]) => slots.some((s) => s.lift === 'deadlift'))
      .map(([day]) => day)
  )
  for (let d = 0; d < D; d++) {
    if (d === conflictDay || dlOccupied.has(d)) continue
    const slots = byDay.get(conflictDay)
    const idx = slots.findIndex((s) => s.lift === 'deadlift' && s.role === 'heavy')
    const [slot] = slots.splice(idx, 1)
    if (!byDay.has(d)) byDay.set(d, [])
    byDay.get(d).push(slot)
    return
  }
  // 대체 요일 없음(빈도가 전 요일 점유) — 충돌 허용
}

export function buildLayout({ daysPerWeek, frequency }) {
  const D = Math.max(1, daysPerWeek)
  const byDay = new Map()
  for (const lift of MAIN_LIFTS) {
    const f = Math.max(0, Math.min(D, frequency?.[lift] ?? 0))
    if (f === 0) continue
    distinctDays(f, D, PHASE[lift]).forEach((day, i) => {
      if (!byDay.has(day)) byDay.set(day, [])
      byDay.get(day).push({ lift, role: roleFor(i) })
    })
  }
  applyAxialGuard(byDay, D)
  return [...byDay.keys()].sort((a, b) => a - b).map((d) => byDay.get(d))
}
