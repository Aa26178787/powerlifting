import { weeklySets } from './volume.js'
import { desiredFrequency } from './frequency.js'
import { MAIN_LIFTS } from './exercises.js'

export function tune({ blend, years, daysPerWeek, fatigue, age }) {
  const perLiftWeekly = weeklySets(blend, years, fatigue, age)
  const frequency = desiredFrequency('strength', daysPerWeek)
  const weeklySetsMap = {}
  const setsPerSession = {}
  for (const lift of MAIN_LIFTS) {
    weeklySetsMap[lift] = perLiftWeekly
    setsPerSession[lift] = Math.max(1, Math.round(perLiftWeekly / frequency[lift]))
  }
  return { weeklySets: weeklySetsMap, frequency, setsPerSession }
}
