import { ROLE, getTemplate, slotTypeForRole } from './templates.js'
import { workingWeight } from './e1rm.js'
import { compVariant } from './style.js'
import { pick } from './variations.js'
import { volumeScale } from './regionStatus.js'
import { byName } from './exercises.js'

export const WEEK_RPE_OFFSET = [0, 0.5, 1.0]

export function cap(rpe) {
  return Math.min(9.5, rpe)
}

function resolveName(slot, ctx) {
  if (slotTypeForRole(slot.role) === 'comp') return compVariant(slot.lift, ctx.style[slot.lift])
  const v = pick(slot.lift, ctx.stickingPoint[slot.lift], ctx.style[slot.lift], ctx.equipment, ctx.advanced)
  return v ? v.name : compVariant(slot.lift, ctx.style[slot.lift])
}

export function buildSession(daySlots, weekIndex, ctx) {
  const offset = WEEK_RPE_OFFSET[weekIndex] ?? 0
  const exercises = daySlots.map((slot) => {
    const role = ROLE[slot.role]
    const rpeTarget = cap(role.rpeStart + offset)
    const name = resolveName(slot, ctx)
    const ex = byName(name)
    const scale = ex ? volumeScale(ex, ctx.regionStatus ?? {}) : 1
    const baseSets = ctx.setsPerSession[slot.lift]
    return {
      lift: name,
      baseLift: slot.lift,
      sets: Math.round(baseSets * scale),
      reps: role.reps,
      rpeTarget,
      pct: undefined,
      weight: workingWeight(ctx.e1rm[slot.lift], role.reps, rpeTarget),
      velocity: null,
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
