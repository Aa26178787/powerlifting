import { weeklySets } from './volume.js'
import { defaultFrequency } from './frequency.js'
import { MAIN_LIFTS } from './exercises.js'

export function tune({ blend, years, daysPerWeek, fatigue, age, frequency }) {
  const perLiftWeekly = weeklySets(blend, years, fatigue, age)
  const freq = frequency ?? defaultFrequency(daysPerWeek)
  const weeklySetsMap = {}
  const setsPerSession = {}
  for (const lift of MAIN_LIFTS) {
    const f = freq?.[lift] ?? 0
    weeklySetsMap[lift] = perLiftWeekly
    setsPerSession[lift] = f > 0 ? Math.max(1, Math.round(perLiftWeekly / f)) : 0
  }
  return { weeklySets: weeklySetsMap, frequency: freq, setsPerSession }
}
