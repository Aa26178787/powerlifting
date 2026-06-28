// 사용자가 빈도 미설정 시 기본값(현재 동작 보존). daysPerWeek로 시드.
export function defaultFrequency(daysPerWeek) {
  return {
    squat: 2,
    bench: daysPerWeek >= 6 ? 3 : 2,
    deadlift: daysPerWeek >= 5 ? 2 : 1,
  }
}

import { classifyBlend } from './quality.js'

// Strength gains rise independently with frequency (Pelland/Zourdos 2025 meta, 강);
// hypertrophy gains track volume, with frequency only distributing it (negligible
// independent effect). So strength/power-dominant non-mixed blends get one extra
// squat/bench session when the weekly day budget allows. Everything else returns
// defaultFrequency unchanged (bit-identical). Exact +1 bias = heuristic (근거 약함).
//
// "room" = days not already occupied by squat+bench slots. Deadlift slots are
// excluded from the used count because deadlift days can absorb additional squat
// or bench work (squat/DL supersets are rare but bench on DL day is common),
// so the real constraint on adding another squat day is the squat+bench footprint.
export function recommendedFrequency(blend, daysPerWeek) {
  const base = defaultFrequency(daysPerWeek)
  const { dom, isMixed } = classifyBlend(blend)
  if (isMixed || (dom !== 'strength' && dom !== 'power')) return base
  const used = base.squat + base.bench
  let room = Math.max(0, daysPerWeek - used)
  const out = { ...base }
  for (const lift of ['squat', 'bench']) {
    if (room <= 0) break
    out[lift] += 1
    room -= 1
  }
  return out
}
