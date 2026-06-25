import { getTemplate, slotTypeForRole } from './templates.js'
import { compVariant } from './style.js'
import { pick } from './variations.js'
import { volumeScale } from './regionStatus.js'
import { byName } from './exercises.js'
import { ZONES, weightFor, weeklyQualitySchedule } from './quality.js'
import { weekPlan } from './periodizationModel.js'

export function cap(rpe) { return Math.min(9.5, rpe) }

function resolveName(slot, ctx) {
  if (slotTypeForRole(slot.role) === 'comp') return compVariant(slot.lift, ctx.style[slot.lift])
  const v = pick(slot.lift, ctx.stickingPoint[slot.lift], ctx.style[slot.lift], ctx.equipment, ctx.advanced)
  return v ? v.name : compVariant(slot.lift, ctx.style[slot.lift])
}

function buildExercise(slot, quality, rpeOffset, ctx) {
  const name = resolveName(slot, ctx)
  const ex = byName(name)
  const z = ZONES[quality]
  const scale = ex ? volumeScale(ex, ctx.regionStatus ?? {}) : 1
  const rpeTarget = z.loading === 'rpe' ? cap(z.rpeTarget + rpeOffset) : null
  return {
    lift: name,
    baseLift: slot.lift,
    quality,
    sets: Math.round(ctx.setsPerSession[slot.lift] * scale),
    reps: z.reps,
    repAnchor: z.repAnchor,
    pct: Math.round((z.pct[0] + z.pct[1]) / 2 * 100),
    rpeTarget,
    weight: weightFor(quality, ctx.e1rm[slot.lift]),
    velocity: null,
    autoregulate: true,
  }
}

export function buildWorkingWeeks(templateKey, daysPerWeek, ctx) {
  const template = getTemplate(templateKey)
  const layout = template.layouts[daysPerWeek]
  if (!layout) throw new Error(`template ${templateKey} has no layout for ${daysPerWeek} days`)

  // count working slots per lift in the layout
  const slotCounts = {}
  for (const day of layout) for (const slot of day) slotCounts[slot.lift] = (slotCounts[slot.lift] || 0) + 1

  const weeks = []
  for (let w = 0; w < 3; w++) {
    const wp = weekPlan(ctx.model, w, ctx.blend, ctx.competition)
    // per-lift quality schedule for this week + a consuming index
    const sched = {}, idx = {}
    for (const lift of Object.keys(slotCounts)) {
      sched[lift] = weeklyQualitySchedule(slotCounts[lift], wp.blend)
      idx[lift] = 0
    }
    const sessions = layout.map((daySlots, dayIdx) => {
      const exercises = daySlots.map((slot) => {
        const quality = sched[slot.lift][idx[slot.lift]++] ?? 'strength'
        return buildExercise(slot, quality, wp.rpeOffset, ctx)
      })
      return { day: dayIdx + 1, exercises }
    })
    weeks.push({ index: w + 1, isDeload: false, sessions })
  }
  return weeks
}
