import { workingWeight } from './e1rm.js'
import { byName } from './exercises.js'

export function buildDeloadWeek(workingWeek, ctx) {
  const sessions = workingWeek.sessions.map((session) => ({
    day: session.day,
    exercises: session.exercises.map((ex) => ({
      ...ex,
      sets: Math.ceil(ex.sets / 2),
      rpeTarget: 6,
      weight: workingWeight(ctx.e1rm[ex.baseLift ?? ex.lift] * (byName(ex.lift)?.e1rmModifier ?? 1), Math.min(12, ex.repAnchor ?? 5), 6),
      velocity: null,
    })),
  }))
  return { index: workingWeek.index + 1, isDeload: true, sessions }
}

export function needsDeload(weekIndex, fatigue) {
  if (weekIndex >= 4) return true
  if (fatigue >= 5 && weekIndex >= 3) return true
  return false
}
