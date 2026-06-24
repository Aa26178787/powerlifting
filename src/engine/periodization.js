import { ROLE, getTemplate } from './templates.js'
import { workingWeight } from './e1rm.js'

export const WEEK_RPE_OFFSET = [0, 0.5, 1.0]

export function cap(rpe) {
  return Math.min(9.5, rpe)
}

export function buildSession(daySlots, weekIndex, ctx) {
  const offset = WEEK_RPE_OFFSET[weekIndex] ?? 0
  const exercises = daySlots.map((slot) => {
    const role = ROLE[slot.role]
    const rpeTarget = cap(role.rpeStart + offset)
    const e1rm = ctx.e1rm[slot.lift]
    return {
      lift: slot.lift,
      sets: ctx.setsPerSession[slot.lift],
      reps: role.reps,
      rpeTarget,
      pct: undefined, // filled below
      weight: workingWeight(e1rm, role.reps, rpeTarget),
      velocity: null, // Phase 2 VBT stub
    }
  })
  return { day: null, exercises }
}

export function buildWorkingWeeks(templateKey, daysPerWeek, ctx) {
  const template = getTemplate(templateKey)
  const layout = template.layouts[daysPerWeek]
  if (!layout) {
    throw new Error(`template ${templateKey} has no layout for ${daysPerWeek} days`)
  }
  const weeks = []
  for (let w = 0; w < 3; w++) {
    const sessions = layout.map((daySlots, dayIdx) => {
      const session = buildSession(daySlots, w, ctx)
      session.day = dayIdx + 1
      return session
    })
    weeks.push({ index: w + 1, isDeload: false, sessions })
  }
  return weeks
}
