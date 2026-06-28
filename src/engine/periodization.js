import { slotTypeForRole } from './templates.js'
import { compVariant } from './style.js'
import { pick } from './variations.js'
import { volumeScale } from './regionStatus.js'
import { byName, equipmentSatisfies } from './exercises.js'
import { ZONES, weightFor, weeklyQualitySchedule, classifyBlend, strengthShare } from './quality.js'
import { weekPlan, phaseFor } from './periodizationModel.js'
import { SCHEMES, pickScheme, schemeSeed } from './setSchemes.js'
import { cueVariation } from './cueVariation.js'
import { volumeRamp, volumeRampMode, loadRamp, PER_SESSION_CAP } from './volume.js'
import { roundToIncrement } from './e1rm.js'

export function cap(rpe) { return Math.min(9.5, rpe) }

/** Returns true when a named exercise is equipment-feasible and advanced-appropriate for ctx. */
function feasible(name, ctx) {
  const ex = byName(name)
  if (!ex) return false
  if (!equipmentSatisfies(ex.equipment, ctx.equipment)) return false
  if (!ctx.advanced && ex.advanced) return false
  return true
}

function resolveName(slot, ctx) {
  if (slotTypeForRole(slot.role) === 'comp') return compVariant(slot.lift, ctx.style[slot.lift])
  const excluded = ctx.excludedExercises ?? []
  const override = ctx.variationOverride?.[slot.lift]
  if (override && !excluded.includes(override) && feasible(override, ctx)) return override
  // A motor-cue deficit prescribes its teaching variation (unless overridden/excluded).
  const cue = cueVariation(slot.lift, ctx.cueNeed?.[slot.lift])
  if (cue && !excluded.includes(cue) && feasible(cue, ctx)) return cue
  const v = pick(slot.lift, ctx.stickingPoint[slot.lift], ctx.style[slot.lift], ctx.equipment, ctx.advanced, excluded, ctx.stickingCause?.[slot.lift])
  return v ? v.name : compVariant(slot.lift, ctx.style[slot.lift])
}

// Never program a working set above ~97.5% of the (unramped) projected max —
// guards pct-anchored peak schemes (wave 0.98, ramping 0.95) from compounding
// past 1RM once loadRamp is applied.
function clampSets(sets, ceiling) {
  return sets.map((s) => (Number.isFinite(s.weight) ? { ...s, weight: Math.min(s.weight, ceiling) } : s))
}

function buildExercise(slot, quality, ctx) {
  const name = resolveName(slot, ctx)
  const ex = byName(name)
  const z = ZONES[quality]
  const scale = ex ? volumeScale(ex, ctx.regionStatus ?? {}) : 1
  // Weekly progression is via LOAD at a constant target RPE (not RPE creep) —
  // keeps the displayed weight↔RPE label consistent.
  const rpeTarget = z.loading === 'rpe' ? cap(z.rpeTarget) : null
  const role = slotTypeForRole(slot.role) === 'comp' ? 'comp' : (slot.role === 'accessory' ? 'accessory' : 'variation')
  const base = ctx.e1rm[slot.lift] * (byName(name)?.e1rmModifier ?? 1)
  const eff = base * loadRamp(ctx.weekIndex ?? 0, ctx.totalWeeks ?? 3)
  const ceiling = roundToIncrement(base * 0.975)
  const weekSets = ctx.weekSets?.[slot.lift] ?? ctx.setsPerSession[slot.lift]
  const baseSets = Math.round(weekSets * scale)
  // scale 0 (region status 3) → 0 sets → generate drops the lift + notes it.
  // Short-circuit BEFORE scheme expansion, since some expanders always emit >=1 set.
  if (baseSets < 1) {
    return {
      lift: name, baseLift: slot.lift, quality,
      reps: z.reps, repAnchor: z.repAnchor,
      pct: Math.round((z.pct[0] + z.pct[1]) / 2 * 100),
      rpeTarget, weight: Math.min(weightFor(quality, eff), ceiling), velocity: null, autoregulate: true,
      scheme: { type: 'straight', evidenceTier: 'rct', sets: [], note: undefined, group: undefined },
      sets: 0,
    }
  }
  const phase = phaseFor(ctx.weekIndex ?? 0, ctx.totalWeeks ?? 3, ctx.peaking)
  const cls = ctx.blend ? classifyBlend(ctx.blend) : null
  const concurrent = !!(cls && cls.isMixed && cls.n.hypertrophy >= 0.25 && (ctx.years == null || ctx.years >= 1))
  // ss = strength share of the (str+hyp) pool; hypShare = complement passed to pickScheme.
  // All expanders receive heavyShare but only strengthHypertrophy destructures it →
  // topSetBackoff/straight/etc. ignore it → PL path bit-identical.
  const ss = ctx.blend ? strengthShare(ctx.blend) : 0.5
  const seed = schemeSeed(slot.lift, slot.role)
  const key = pickScheme({ quality, role, phase, advanced: !!ctx.advanced, weekIndex: ctx.weekIndex ?? 0, seed, concurrent, hypShare: 1 - ss })
  const scheme = SCHEMES[key]
  const expanded = scheme.expand({ quality, e1rm: eff, zone: z, baseSets, weekIndex: ctx.weekIndex ?? 0, phase, totalWeeks: ctx.totalWeeks ?? 3, heavyShare: ss })
  const clampedSets = clampSets(expanded.sets, ceiling)
  const displayReps = key === 'strengthHypertrophy'
    ? [ZONES.strength.reps[0], ZONES.hypertrophy.reps[1]]
    : z.reps
  return {
    lift: name,
    baseLift: slot.lift,
    quality,
    reps: displayReps,
    repAnchor: z.repAnchor,
    pct: Math.round((z.pct[0] + z.pct[1]) / 2 * 100),
    rpeTarget,
    weight: Math.min(weightFor(quality, eff), ceiling),
    velocity: null,
    autoregulate: true,
    tempo: ex?.tempo ?? null,
    tempoStop: ex?.tempoStop ?? null,
    scheme: { type: key, evidenceTier: scheme.evidenceTier, sets: clampedSets, note: expanded.note, group: expanded.group },
    sets: clampedSets.length,
  }
}

// Builds ONE working week with block-relative ramp.
// blockWeek: 0-based position within the block (drives volumeRamp + loadRamp reset).
// blockLen: total work weeks in this block (ramp denominator).
// weekNumber: 1-based continuous index placed on the returned week object.
// Sets ctx.weekIndex = blockWeek and ctx.totalWeeks = blockLen as side-effects
// (matching the legacy behaviour for callers that read ctx after the call).
export function buildBlockWeek(layout, ctx, blockWeek, blockLen, weekNumber) {
  const slotCounts = {}
  for (const day of layout) for (const slot of day) slotCounts[slot.lift] = (slotCounts[slot.lift] || 0) + 1

  ctx.totalWeeks = blockLen
  ctx.weekIndex = blockWeek

  // Ramp mode: derived from blend + peaking once per mesocycle (deterministic).
  // taper (peaking) uses floor=2 to prevent single-set collapse in peak week.
  const mode = volumeRampMode(ctx.blend, ctx.peaking)
  const taperFloor = mode === 'taper' ? 2 : 1

  // Per-week volume ramp: scale the floor setsPerSession up toward MRV, capped
  // by MRV / sessions-per-lift so a lift never exceeds its weekly MRV.
  const ramp = volumeRamp(blockWeek, blockLen, mode)
  ctx.weekSets = {}
  for (const lift of Object.keys(slotCounts)) {
    const base = ctx.setsPerSession[lift] ?? 0
    // §3.3 Mode B guard: ctx.volumeOverridden undefined (direct-call tests) → falsy → current path.
    if (ctx.volumeOverridden?.has(lift) && ctx.volumeMode === 'fixed') {
      ctx.weekSets[lift] = Math.max(taperFloor, base)   // flat, caps released (warn-only via volumeWarnings)
    } else {
      const mrvCap = ctx.mrv ? Math.floor(ctx.mrv / slotCounts[lift]) : Infinity
      const absCap = PER_SESSION_CAP[lift] ?? 6   // absolute per-session ceiling survives the ramp
      ctx.weekSets[lift] = Math.max(taperFloor, Math.min(Math.round(base * ramp), mrvCap, absCap))
    }
  }

  const wp = weekPlan(ctx.model, blockWeek, ctx.blend, ctx.competition, blockLen)
  // per-lift quality schedule for this week + a consuming index
  const sched = {}, idx = {}
  for (const lift of Object.keys(slotCounts)) {
    sched[lift] = weeklyQualitySchedule(slotCounts[lift], wp.blend)
    idx[lift] = 0
  }
  const sessions = layout.map((daySlots, dayIdx) => {
    const exercises = daySlots.map((slot) => {
      const quality = sched[slot.lift][idx[slot.lift]++] ?? 'strength'
      return buildExercise(slot, quality, ctx)
    })
    return { day: dayIdx + 1, exercises }
  })
  return { index: weekNumber, isDeload: false, sessions }
}

// Builds all working weeks for a single-block mesocycle (≤8 weeks, legacy path).
// For ≤8 weeks there is exactly one block: blockWeek === w, blockLen === totalWeeks,
// so buildBlockWeek produces bit-identical output to the old inline loop.
export function buildWorkingWeeks(layout, ctx, totalWeeks = 3) {
  if (!layout) throw new Error('buildWorkingWeeks requires a layout')
  ctx.totalWeeks = totalWeeks
  const weeks = []
  for (let w = 0; w < totalWeeks; w++) {
    weeks.push(buildBlockWeek(layout, ctx, w, totalWeeks, w + 1))
  }
  return weeks
}
