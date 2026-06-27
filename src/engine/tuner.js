import { weeklySets, PER_SESSION_CAP } from './volume.js'
import { defaultFrequency } from './frequency.js'
import { MAIN_LIFTS } from './exercises.js'

export function tune({ blend, years, daysPerWeek, fatigue, age, frequency }) {
  const perLiftWeekly = weeklySets(blend, years, fatigue, age)
  const freq = frequency ?? defaultFrequency(daysPerWeek)
  const weeklySetsMap = {}
  const setsPerSession = {}
  for (const lift of MAIN_LIFTS) {
    const f = freq?.[lift] ?? 0
    const cap = PER_SESSION_CAP[lift] ?? 6
    weeklySetsMap[lift] = perLiftWeekly
    // Absolute per-session cap: weekly volume that doesn't fit at the cap is not
    // stacked into one session (junk volume) — add a session for that lift.
    setsPerSession[lift] = f > 0 ? Math.min(cap, Math.max(1, Math.round(perLiftWeekly / f))) : 0
  }
  return { weeklySets: weeklySetsMap, frequency: freq, setsPerSession }
}
