import { slotTypeForRole } from './templates.js'
import { compVariant } from './style.js'
import { pick } from './variations.js'
import { volumeScale } from './regionStatus.js'
import { byName, equipmentSatisfies } from './exercises.js'
import { ZONES, weightFor, weeklyQualitySchedule, classifyBlend, strengthShare } from './quality.js'
import { weekPlan, phaseFor } from './periodizationModel.js'
import { SCHEMES, pickScheme, schemeSeed, clampBackoffRpe } from './setSchemes.js'
import { cueVariation } from './cueVariation.js'
import { volumeRamp, volumeRampMode, loadRamp, PER_SESSION_CAP, LIFT_REP_CAP } from './volume.js'
import { roundToIncrement, loadForRpe } from './e1rm.js'

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
  const phase = phaseFor(ctx.phaseWeekIndex ?? ctx.weekIndex ?? 0, ctx.phaseTotalWeeks ?? ctx.totalWeeks ?? 3, ctx.peaking)
  const cls = ctx.blend ? classifyBlend(ctx.blend) : null
  const concurrent = !!(cls && cls.isMixed && cls.n.hypertrophy >= 0.25 && (ctx.years == null || ctx.years >= 1))
  // ss = strength share of the (str+hyp) pool; hypShare = complement passed to pickScheme.
  // All expanders receive heavyShare but only strengthHypertrophy destructures it →
  // topSetBackoff/straight/etc. ignore it → PL path bit-identical.
  const ss = ctx.blend ? strengthShare(ctx.blend) : 0.5
  const seed = schemeSeed(slot.lift, slot.role)
  const key = pickScheme({ quality, role, phase, advanced: !!ctx.advanced, weekIndex: ctx.phaseWeekIndex ?? ctx.weekIndex ?? 0, seed, concurrent, hypShare: 1 - ss })
  const scheme = SCHEMES[key]
  const expanded = scheme.expand({ quality, e1rm: eff, zone: z, baseSets, weekIndex: ctx.phaseWeekIndex ?? ctx.weekIndex ?? 0, phase, totalWeeks: ctx.phaseTotalWeeks ?? ctx.totalWeeks ?? 3, heavyShare: ss, backoffRpeDrop: ctx.backoffRpeDrop ?? 0, backoffPct: ctx.backoffPct?.[slot.lift] ?? null })
  const clampedSets = clampSets(expanded.sets, ceiling)
  // Per-lift rep cap (deadlift ≤6): clamp any numeric reps over the cap and
  // recompute load at the SAME RPE (fewer reps → heavier) so intensity matches.
  // pct-anchored sets (rpe null) keep their weight. Lifts without a cap are
  // value-identical (capR is identity). See LIFT_REP_CAP in volume.js.
  const repCap = LIFT_REP_CAP[slot.lift]
  const capR = (r) => (repCap != null && typeof r === 'number' ? Math.min(r, repCap) : r)
  const cappedSets = repCap == null ? clampedSets : clampedSets.map((s) => {
    if (typeof s.reps !== 'number' || s.reps <= repCap) return s
    // s.rpe is a per-set fatigue-ramp label that risingRpe can floor as low as 5
    // (e.g. a heavily-lightened backoff via backoffRpeDrop). loadForRpe→pctOf1RM is
    // only defined for RPE 6–10, so clamp into the chart domain before recomputing
    // the capped-rep load. Default plans never reach <6 here (deadlift backoff RPE
    // stays ≥6.5), so this is a no-op for the existing 754-test baseline.
    const weight = s.rpe != null ? Math.min(loadForRpe(eff, repCap, clampBackoffRpe(s.rpe)), ceiling) : s.weight
    return { ...s, reps: repCap, weight }
  })
  const displayReps = (key === 'strengthHypertrophy'
    ? [ZONES.strength.reps[0], ZONES.hypertrophy.reps[1]]
    : z.reps).map(capR)
  // Headline weight: for a rep-capped rpe-loaded lift, compute at the capped
  // anchor so it reflects the heavier capped-rep load (not the zone's anchor).
  const headlineWeight = (repCap != null && z.loading === 'rpe')
    ? Math.min(loadForRpe(eff, capR(z.repAnchor), cap(z.rpeTarget)), ceiling)
    : Math.min(weightFor(quality, eff), ceiling)
  return {
    lift: name,
    baseLift: slot.lift,
    quality,
    reps: displayReps,
    repAnchor: capR(z.repAnchor),
    pct: Math.round((z.pct[0] + z.pct[1]) / 2 * 100),
    rpeTarget,
    weight: headlineWeight,
    velocity: null,
    autoregulate: true,
    tempo: ex?.tempo ?? null,
    tempoStop: ex?.tempoStop ?? null,
    scheme: { type: key, evidenceTier: scheme.evidenceTier, sets: cappedSets, note: expanded.note, group: expanded.group },
    sets: cappedSets.length,
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

  const wp = weekPlan(ctx.model, ctx.phaseWeekIndex ?? blockWeek, ctx.blend, ctx.competition, ctx.phaseTotalWeeks ?? blockLen)
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
    ctx.phaseWeekIndex = w
    ctx.phaseTotalWeeks = totalWeeks
    weeks.push(buildBlockWeek(layout, ctx, w, totalWeeks, w + 1))
  }
  return weeks
}
