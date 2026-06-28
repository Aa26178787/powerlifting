import { loadForRpe } from './e1rm.js'
import { byName } from './exercises.js'

export function buildDeloadWeek(workingWeek, ctx, opts = {}) {
  const sessions = workingWeek.sessions.map((session) => ({
    day: session.day,
    exercises: session.exercises.map((ex) => {
      if (opts.realization) {
        // Bosquet realization taper: hold intensity (weight/rpeTarget), cut volume to ~40%.
        // Evidence: effective pre-meet taper holds intensity and reduces only set count.
        const sets = Math.max(1, Math.round(ex.sets * 0.4))
        const weight = ex.weight
        const rpeTarget = ex.rpeTarget
        const sampleSet = ex.scheme?.sets?.[0] ?? { weight, reps: ex.repAnchor ?? 3, rpe: rpeTarget }
        return { ...ex, sets, rpeTarget, weight, velocity: null,
          scheme: { type: 'straight', evidenceTier: 'rct', sets: Array.from({ length: sets }, () => ({ ...sampleSet })) } }
      }
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

