import { e1rmFrom } from './e1rm.js'
import { selectTemplate } from './selector.js'
import { tune } from './tuner.js'
import { buildWorkingWeeks } from './periodization.js'
import { buildDeloadWeek } from './deload.js'
import { MAIN_LIFTS, substitute } from './exercises.js'

export function resolveE1rm(liftInput) {
  if (liftInput && typeof liftInput.oneRM === 'number') return liftInput.oneRM
  const { weight, reps, rpe } = liftInput
  return e1rmFrom(weight, reps, rpe)
}

function applySubstitutions(weeks, injuries) {
  if (!injuries || injuries.length === 0) return weeks
  return weeks.map((wk) => ({
    ...wk,
    sessions: wk.sessions.map((s) => ({
      ...s,
      exercises: s.exercises.map((ex) => ({ ...ex, lift: substitute(ex.lift, injuries) })),
    })),
  }))
}

export function generate(profile) {
  const { lifts, years, daysPerWeek, goal, fatigue, injuries } = profile

  const e1rm = {}
  for (const lift of MAIN_LIFTS) e1rm[lift] = resolveE1rm(lifts[lift])

  const template = selectTemplate({ goal, years, daysPerWeek })
  const tuned = tune({ goal, years, daysPerWeek, fatigue })
  const ctx = { e1rm, setsPerSession: tuned.setsPerSession }

  const working = buildWorkingWeeks(template, daysPerWeek, ctx)
  const deload = buildDeloadWeek(working[working.length - 1], ctx)
  const weeks = applySubstitutions([...working, deload], injuries)

  return { template, weeks }
}
