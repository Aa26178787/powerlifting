import { generate } from '../../engine/generate.js'
import { pctOf1RM } from '../../engine/e1rm.js'
import { accessoriesFor, filterByEquipment, substitute, MAIN_LIFTS } from '../../engine/exercises.js'

export function toEngineProfile(form) {
  return {
    lifts: form.lifts,
    years: form.years,
    daysPerWeek: form.daysPerWeek,
    goal: form.goal,
    fatigue: form.fatigue,
    injuries: form.injuries,
  }
}

export function enrichExercise(ex) {
  const inRange = Number.isInteger(ex.reps) && ex.reps >= 1 && ex.reps <= 12
  return { ...ex, pct: inRange ? pctOf1RM(ex.reps, ex.rpeTarget) : null }
}

export function accessoriesForSession(session, equipment, injuries, sessionTimeLimit) {
  // Map each exercise's (possibly injury-substituted) lift back to its base main
  // lift, so accessories are still found when e.g. a knee injury renamed
  // squat -> box squat (generate() substitutes lift names before buildPlan runs).
  const baseLifts = session.exercises
    .map((e) => MAIN_LIFTS.find((base) => base === e.lift || substitute(base, injuries) === e.lift))
    .filter(Boolean)
  const names = []
  for (const lift of baseLifts) {
    for (const acc of accessoriesFor(lift)) names.push(acc)
  }
  const available = filterByEquipment(names, equipment)
  const subbed = available.map((a) => substitute(a, injuries))
  const deduped = [...new Set(subbed)]
  if (typeof sessionTimeLimit === 'number' && sessionTimeLimit > 0) {
    const cap = Math.max(1, Math.floor(sessionTimeLimit / 20))
    return deduped.slice(0, cap)
  }
  return deduped
}

export function buildPlan(form) {
  const raw = generate(toEngineProfile(form))
  const weeks = raw.weeks.map((wk) => ({
    ...wk,
    sessions: wk.sessions.map((s) => ({
      ...s,
      exercises: s.exercises.map(enrichExercise),
      accessories: accessoriesForSession(s, form.equipment, form.injuries, form.sessionTimeLimit),
    })),
  }))
  return { template: raw.template, weeks }
}
