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
    // Deadlift is highly axially fatiguing and recovers slower than squat/bench;
    // scale its weekly target ~0.6× before distributing. Consensus-tier calibration.
    const liftWeekly = lift === 'deadlift' ? Math.round(0.6 * perLiftWeekly) : perLiftWeekly
    // Absolute per-session cap: weekly volume that doesn't fit at the cap is not
    // stacked into one session (junk volume) — add a session for that lift.
    const spSession = f > 0 ? Math.min(cap, Math.max(1, Math.round(liftWeekly / f))) : 0
    setsPerSession[lift] = spSession
    // Report DELIVERED volume (setsPerSession × freq), not the uncapped weekly target.
    // Avoids a silent drop when the per-session cap is the binding constraint.
    weeklySetsMap[lift] = f > 0 ? spSession * f : 0
  }
  return { weeklySets: weeklySetsMap, frequency: freq, setsPerSession }
}
