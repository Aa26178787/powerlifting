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
  return [...byDay.keys()].sort((a, b) => a - b).map((d) => byDay.get(d))
}
