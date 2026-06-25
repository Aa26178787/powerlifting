import { getTemplate, slotTypeForRole } from './templates.js'
import { compVariant } from './style.js'
import { pick } from './variations.js'
import { volumeScale } from './regionStatus.js'
import { byName } from './exercises.js'
import { ZONES, weightFor, weeklyQualitySchedule } from './quality.js'
import { weekPlan, phaseFor } from './periodizationModel.js'
import { SCHEMES, pickScheme } from './setSchemes.js'
import { cueVariation } from './cueVariation.js'

export function cap(rpe) { return Math.min(9.5, rpe) }

function resolveName(slot, ctx) {
  if (slotTypeForRole(slot.role) === 'comp') return compVariant(slot.lift, ctx.style[slot.lift])
  const excluded = ctx.excludedExercises ?? []
  const override = ctx.variationOverride?.[slot.lift]
  if (override && byName(override) && !excluded.includes(override)) return override
  // A motor-cue deficit prescribes its teaching variation (unless overridden/excluded).
  const cue = cueVariation(slot.lift, ctx.cueNeed?.[slot.lift])
  if (cue && byName(cue) && !excluded.includes(cue)) return cue
  const v = pick(slot.lift, ctx.stickingPoint[slot.lift], ctx.style[slot.lift], ctx.equipment, ctx.advanced, excluded)
  return v ? v.name : compVariant(slot.lift, ctx.style[slot.lift])
}

function buildExercise(slot, quality, rpeOffset, ctx) {
  const name = resolveName(slot, ctx)
  const ex = byName(name)
  const z = ZONES[quality]
  const scale = ex ? volumeScale(ex, ctx.regionStatus ?? {}) : 1
  const rpeTarget = z.loading === 'rpe' ? cap(z.rpeTarget + rpeOffset) : null
  const role = slotTypeForRole(slot.role) === 'comp' ? 'comp' : (slot.role === 'accessory' ? 'accessory' : 'variation')
  const eff = ctx.e1rm[slot.lift] * (byName(name)?.e1rmModifier ?? 1)
  const baseSets = Math.round(ctx.setsPerSession[slot.lift] * scale)
  // scale 0 (region status 3) → 0 sets → generate drops the lift + notes it.
  // Short-circuit BEFORE scheme expansion, since some expanders always emit >=1 set.
  if (baseSets < 1) {
    return {
      lift: name, baseLift: slot.lift, quality,
      reps: z.reps, repAnchor: z.repAnchor,
      pct: Math.round((z.pct[0] + z.pct[1]) / 2 * 100),
      rpeTarget, weight: weightFor(quality, eff), velocity: null, autoregulate: true,
      scheme: { type: 'straight', evidenceTier: 'rct', sets: [], note: undefined, group: undefined },
      sets: 0,
    }
  }
  const phase = phaseFor(ctx.weekIndex ?? 0, ctx.totalWeeks ?? 3, ctx.peaking)
  const key = pickScheme({ quality, role, phase, advanced: !!ctx.advanced, weekIndex: ctx.weekIndex ?? 0 })
  const scheme = SCHEMES[key]
  const expanded = scheme.expand({ quality, e1rm: eff, zone: z, baseSets, weekIndex: ctx.weekIndex ?? 0 })
  return {
    lift: name,
    baseLift: slot.lift,
    quality,
    reps: z.reps,
    repAnchor: z.repAnchor,
    pct: Math.round((z.pct[0] + z.pct[1]) / 2 * 100),
    rpeTarget,
    weight: weightFor(quality, eff),
    velocity: null,
    autoregulate: true,
    tempo: ex?.tempo ?? null,
    tempoStop: ex?.tempoStop ?? null,
    scheme: { type: key, evidenceTier: scheme.evidenceTier, sets: expanded.sets, note: expanded.note, group: expanded.group },
    sets: expanded.sets.length,
  }
}

export function buildWorkingWeeks(templateKey, daysPerWeek, ctx, totalWeeks = 3) {
  const template = getTemplate(templateKey)
  const layout = template.layouts[daysPerWeek]
  if (!layout) throw new Error(`template ${templateKey} has no layout for ${daysPerWeek} days`)

  // count working slots per lift in the layout
  const slotCounts = {}
  for (const day of layout) for (const slot of day) slotCounts[slot.lift] = (slotCounts[slot.lift] || 0) + 1

  ctx.totalWeeks = totalWeeks

  const weeks = []
  for (let w = 0; w < totalWeeks; w++) {
    ctx.weekIndex = w
    const wp = weekPlan(ctx.model, w, ctx.blend, ctx.competition, totalWeeks)
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
