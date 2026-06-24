import { weeklySets } from './volume.js'
import { desiredFrequency } from './frequency.js'
import { MAIN_LIFTS } from './exercises.js'

export function tune({ goal, years, daysPerWeek, fatigue }) {
  const perLiftWeekly = weeklySets(goal, years, fatigue)
  const frequency = desiredFrequency(goal, daysPerWeek)

  const weeklySetsMap = {}
  const setsPerSession = {}
  for (const lift of MAIN_LIFTS) {
    weeklySetsMap[lift] = perLiftWeekly
    setsPerSession[lift] = Math.max(1, Math.round(perLiftWeekly / frequency[lift]))
  }
  return { weeklySets: weeklySetsMap, frequency, setsPerSession }
}
