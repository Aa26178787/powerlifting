import { generate } from '../../engine/generate.js'
import { pctOf1RM } from '../../engine/e1rm.js'

export function toEngineProfile(form) {
  return {
    lifts: form.lifts,
    years: form.years,
    daysPerWeek: form.daysPerWeek,
    goal: form.goal,
    fatigue: form.fatigue,
    style: form.style,
    stickingPoint: form.stickingPoint,
    regionStatus: form.regionStatus,
    equipment: form.equipment,
    sessionTimeLimit: form.sessionTimeLimit,
  }
}

export function enrichExercise(ex) {
  const inRange = Number.isInteger(ex.reps) && ex.reps >= 1 && ex.reps <= 12
  return { ...ex, pct: inRange ? pctOf1RM(ex.reps, ex.rpeTarget) : null }
}

export function buildPlan(form) {
  const raw = generate(toEngineProfile(form))
  const weeks = raw.weeks.map((wk) => ({
    ...wk,
    sessions: wk.sessions.map((s) => ({
      ...s,
      exercises: s.exercises.map(enrichExercise),
      accessories: s.accessories ?? [],
    })),
  }))
  return { template: raw.template, weeks }
}
