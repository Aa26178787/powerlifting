import { loadForRpe } from './e1rm.js'
import { byName } from './exercises.js'

export function buildDeloadWeek(workingWeek, ctx) {
  const sessions = workingWeek.sessions.map((session) => ({
    day: session.day,
    exercises: session.exercises.map((ex) => {
      const sets = Math.ceil(ex.sets / 2)
      // Deload rebuilds from base e1rm at RPE 6 (no loadRamp) → resets each cycle.
      const weight = loadForRpe(ctx.e1rm[ex.baseLift ?? ex.lift] * (byName(ex.lift)?.e1rmModifier ?? 1), ex.repAnchor ?? 5, 6)
      const reps = ex.repAnchor ?? 5
      return { ...ex, sets, rpeTarget: 6, weight, velocity: null,
        scheme: { type: 'straight', evidenceTier: 'rct', sets: Array.from({ length: sets }, () => ({ weight, reps, rpe: 6 })) } }
    }),
  }))
  return { index: workingWeek.index + 1, isDeload: true, sessions }
}

export function needsDeload(weekIndex, fatigue) {
  if (weekIndex >= 4) return true
  if (fatigue >= 5 && weekIndex >= 3) return true
  return false
}
