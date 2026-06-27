import { e1rmFrom } from './e1rm.js'
import { tune } from './tuner.js'
import { buildWorkingWeeks } from './periodization.js'
import { buildDeloadWeek } from './deload.js'
import { MAIN_LIFTS, byName } from './exercises.js'
import { select } from './accessories.js'
import { pick } from './variations.js'
import { shouldSwap } from './regionStatus.js'
import { normalizeBlend, DEFAULT_BLEND, classifyBlend } from './quality.js'
import { bandForBlend, BANDS, PER_SESSION_CAP } from './volume.js'
import { buildLayout } from './layoutGenerator.js'
import { defaultFrequency } from './frequency.js'
import { phaseFor } from './periodizationModel.js'
import { pickScheme, expandAccessory, SCHEMES } from './setSchemes.js'
import { newLedger, addToLedger, summarize, PER_MUSCLE_BANDS } from './muscleVolume.js'

// Accessories support hypertrophy by default; core/ab work trends to endurance.
function accessoryQuality(ex) {
  return /core|ab|oblique/i.test(ex.primaryMuscle ?? '') ? 'endurance' : 'hypertrophy'
}

// Deficit-fill suppression curve for peaking plans.
// Non-peaking always returns 1 (bit-for-bit identical to pre-peak behaviour).
// Peaking: taper deficit-fill as the meet nears — accumulation keeps full fill,
// intensification halves it, peak blocks it entirely (prevents accessories from
// back-filling intentionally reduced main-lift volume, which would reverse the taper).
// Direction is consensus (Issurin 2010; Mujika & Padilla 2003); exact multipliers
// (1.0 / 0.5 / 0.0) are heuristics.
function deficitPhaseScale(phase, peaking) {
  if (!peaking) return 1
  if (phase === 'accumulation')    return 1.0
  if (phase === 'intensification') return 0.5
  return 0.0 // peak — block deficit-fill entirely
}

// Deficit-fill base weight.
// hyp/endurance dominant → full 0.6 (unchanged from prior gate).
// strength/power dominant → linear ramp on hyp share (SBD specificity gate).
// dead-zone (hyp ≤ LO=0.30) → Math.max clamps to exactly 0 (FP-safe for PL hyp=0.20).
// ramp saturates at HI=0.50 → 0.6 full (e.g. 50/50 str/hyp blend).
// HI must stay ≤ 0.50: raising it toward bodybuilding (0.80) compresses the range,
// dropping PB 0.45→~0.18 (below effective activation floor ~0.40) — silent bug re-emerge.
const DEFICIT_FULL    = 0.6   // existing gate "on" value — no new magic number
const HYP_DEFICIT_LO  = 0.30  // str/pwr: hyp share ≤ LO → 0 (PL safe, gap from hyp=0.20)
const HYP_DEFICIT_HI  = 0.50  // str/pwr: hyp share ≥ HI → DEFICIT_FULL (50/50 gets full)
export function deficitBaseWeight({ dom, n }) {
  if (dom !== 'strength' && dom !== 'power') return DEFICIT_FULL
  const ramp = Math.max(0, Math.min(1,
    (n.hypertrophy - HYP_DEFICIT_LO) / (HYP_DEFICIT_HI - HYP_DEFICIT_LO)))
  return DEFICIT_FULL * ramp
}

function withAccessoryScheme(accessories, { weekIndex, advanced, phase, isDeload }) {
  return accessories.map((a, i) => {
    const quality = accessoryQuality(a)
    const key = isDeload
      ? 'straight'
      : pickScheme({ quality, role: 'accessory', phase, advanced, weekIndex: weekIndex + i })
    const expanded = expandAccessory(key, { quality, baseSets: isDeload ? 2 : 3 })
    return {
      ...a,
      quality,
      scheme: { type: key, evidenceTier: SCHEMES[key].evidenceTier, sets: expanded.sets, note: expanded.note },
    }
  })
}

const DEFAULT_STYLE = { squat: { bar: 'low' }, bench: { grip: 'medium' }, deadlift: { stance: 'conventional' } }
const DEFAULT_STICK = { squat: 'none', bench: 'none', deadlift: 'none' }

export function resolveE1rm(liftInput) {
  if (liftInput && typeof liftInput.oneRM === 'number') return liftInput.oneRM
  const { weight, reps, rpe } = liftInput
  return e1rmFrom(weight, reps, rpe)
}

function sparingSwap(ex, baseLift, style, stickingPoint, equipment, advanced, regionStatus, excluded = []) {
  const bad = new Set(Object.entries(regionStatus).filter(([, v]) => v >= 2).map(([k]) => k))
  const candidate = pick(baseLift, stickingPoint, style, equipment, advanced, excluded)
  if (candidate && !candidate.stress.some((r) => bad.has(r))) return candidate.name
  return ex
}

export function generate(profile) {
  const { years, daysPerWeek, fatigue, lifts } = profile
  const blend = normalizeBlend(profile.qualities ?? DEFAULT_BLEND)
  const competition = profile.competition ?? { on: false, date: '' }
  const mesoWeeks = Math.max(3, Math.min(8, profile.mesoWeeks ?? 4))
  const deloadEnabled = profile.deloadEnabled ?? true
  const peaking = !!(competition.on && competition.date)
  const variationOverride = profile.variationOverride ?? {}
  const excludedExercises = profile.excludedExercises ?? []
  const cueNeed = profile.cueNeed ?? {}
  const model = (!profile.periodizationModel || profile.periodizationModel === 'auto')
    ? 'adaptive'
    : profile.periodizationModel
  const style = profile.style ?? DEFAULT_STYLE
  const stickingPoint = profile.stickingPoint ?? DEFAULT_STICK
  const regionStatus = profile.regionStatus ?? {}
  const equipment = profile.equipment ?? ['barbell', 'rack', 'bench']
  const advanced = years >= 3
  const freqInput = profile.frequency ?? defaultFrequency(daysPerWeek)
  const frequency = {}
  for (const lift of MAIN_LIFTS) frequency[lift] = Math.max(0, Math.min(daysPerWeek, freqInput[lift] ?? 0))

  const e1rm = {}
  for (const lift of MAIN_LIFTS) e1rm[lift] = resolveE1rm(lifts[lift])

  const tuned = tune({ blend, years, daysPerWeek, fatigue, age: profile.age, frequency })
  const mrv = BANDS[bandForBlend(blend)].mrv
  const layout = buildLayout({ daysPerWeek, frequency })
  const slotCounts = {}
  for (const day of layout) for (const slot of day) slotCounts[slot.lift] = (slotCounts[slot.lift] || 0) + 1
  const cappedSetsPerSession = {}
  for (const lift of MAIN_LIFTS) {
    const sc = slotCounts[lift] || 1
    const absCap = PER_SESSION_CAP[lift] ?? 6
    cappedSetsPerSession[lift] = Math.max(1, Math.min(tuned.setsPerSession[lift], absCap, Math.floor(mrv / sc)))
  }
  const priorityLift = profile.priorityLift
  if (priorityLift && MAIN_LIFTS.includes(priorityLift)) {
    const sc = slotCounts[priorityLift] || 1
    const absCap = PER_SESSION_CAP[priorityLift] ?? 6
    cappedSetsPerSession[priorityLift] = Math.max(1, Math.min(cappedSetsPerSession[priorityLift] + 1, absCap, Math.floor(mrv / sc)))
  }
  const ctx = { e1rm, setsPerSession: cappedSetsPerSession, mrv, style, stickingPoint, equipment, advanced, regionStatus, blend, model, competition, variationOverride, excludedExercises, cueNeed, peaking, totalWeeks: mesoWeeks, years }

  const working = buildWorkingWeeks(layout, ctx, mesoWeeks)
  const allWeeks = deloadEnabled ? [...working, buildDeloadWeek(working[working.length - 1], ctx)] : working

  // Blend classification is constant for the whole plan — compute once.
  const cls = classifyBlend(blend)
  const dom = cls.dom
  // Deficit-fill base weight: strength/power dominant uses hyp-share ramp (SBD specificity gate).
  // Overflow guard (isOverMrv) is always active regardless of gate.
  // During peaking the effective weight is further scaled by deficitPhaseScale() per-week.
  const baseDeficit = deficitBaseWeight(cls)
  // Accessory-count bias: hypertrophy-dominant → +1 (more accessories). Strength/power
  // dominant → -1 (fewer, SBD-specific) UNLESS the hyp share is in the active zone
  // (baseDeficit > 0, e.g. powerbuilding str/hyp tie) → 0, granting one extra accessory
  // slot for muscle-group completeness while keeping the strength frame. Pure strength
  // (powerlifting) and power-dominant (athletic) stay at -1 — their baseDeficit is 0.
  const goalBias = dom === 'hypertrophy'
    ? 1
    : (dom === 'strength' || dom === 'power')
      ? (baseDeficit > 0 ? 0 : -1)
      : 0

  const weeks = allWeeks.map((wk) => {
    // Hoist phase and per-week deficit weight once — shared by all three consumers
    // (sharedCap peak taper, select deficitWeight, withAccessoryScheme) so we have
    // a single source of truth per week.
    const phase = phaseFor(wk.index - 1, mesoWeeks, peaking)
    const weekDeficitWeight = baseDeficit * deficitPhaseScale(phase, peaking)

    // ── Phase 1: collect kept exercises per session (deterministic main lifts) ──
    const sessionData = wk.sessions.map((s) => {
      const notes = []
      const exercises = s.exercises
        .map((e) => {
          const ex = byName(e.lift)
          if (ex && shouldSwap(ex, regionStatus)) {
            return { ...e, lift: sparingSwap(e.lift, e.baseLift, style[e.baseLift], stickingPoint[e.baseLift], equipment, advanced, regionStatus, excludedExercises) }
          }
          return e
        })
      const kept = exercises.filter((e) => {
        if (e.sets >= 1) return true
        if (MAIN_LIFTS.includes(e.baseLift)) {
          const ex = byName(e.lift)
          const region = (ex ? ex.stress : []).find((r) => (regionStatus[r] ?? 0) === 3) ?? 'injury'
          notes.push(`${e.baseLift} omitted this week due to severe ${region} status`)
        }
        return false
      })
      return { s, notes, kept }
    })

    // ── Phase 2: seed steering ledger with all this week's main-lift volume ───
    // Mains are deterministic; summing them first gives accessories full headroom info.
    const steeringLedger = newLedger()
    for (const { kept } of sessionData) {
      for (const e of kept) {
        const ex = byName(e.lift)
        if (ex?.primaryMuscle) addToLedger(steeringLedger, ex.primaryMuscle, e.sets)
      }
    }

    // ── Phase 3: assign accessories session by session in fixed order ──────────
    // Each session sees mains + all prior sessions' estimated accessory volume.
    // steeringLedger is updated with ACCESSORY_EST_SETS after each session.
    const sessions = sessionData.map(({ s, notes, kept }) => {
      // ── Accessory selection ───────────────────────────────────────────────
      // Compute main-work time budget consumed (≈ 3.5 min/set incl. rest).
      const mainSets = kept.reduce((sum, e) => sum + e.sets, 0)
      const mainTimeMin = Math.round(mainSets * 3.5)

      // Shared session cap (mirrors select's internal formula; derived once so the
      // budget is split across lifts rather than multiplied per lift).
      // minCap hoisted before both branches so the peak taper can use it as a floor.
      const minCap = goalBias < 0 ? 2 : 1
      let sharedCap
      if (profile.sessionTimeLimit != null) {
        const remaining = profile.sessionTimeLimit - mainTimeMin - 10
        const baseCap = Math.min(4, Math.max(1, Math.floor(remaining / 10)))
        sharedCap = Math.min(5, Math.max(minCap, baseCap + goalBias))
      } else {
        sharedCap = Math.min(5, Math.max(minCap, 3 + goalBias))
      }
      // Peak accessory-count taper (Change B): trim one slot in peak weeks to reduce
      // accessory fatigue alongside the main-lift volume taper. Floor = 1 (not minCap)
      // so pure PL pickers (minCap=2) also taper their peak-week accessories 2→1 —
      // coaching-complete since mains are already ×0.55 in the peak phase.
      // !wk.isDeload guard: deload weeks already halve sets independently (deload.js:8);
      // stacking a count cut would double-reduce — skip it.
      if (peaking && phase === 'peak' && !wk.isDeload) sharedCap = Math.max(1, sharedCap - 1)

      // Run select for EACH distinct main lift; distribute the shared cap evenly
      // (primary gets any remainder slots), dedup by name.
      const distinctLifts = [...new Set(kept.map((e) => e.baseLift))]
      const N = distinctLifts.length
      const seenAccNames = new Set()
      const allRaw = []
      for (let i = 0; i < N; i++) {
        const lft = distinctLifts[i]
        const liftCap = Math.floor(sharedCap / N) + (i < sharedCap % N ? 1 : 0)
        const liftAcc = select({
          lift: lft,
          style: style[lft],
          stickingPoint: stickingPoint[lft],
          equipmentAvailable: equipment,
          sessionTimeLimit: profile.sessionTimeLimit,
          mainTimeMin,
          goalBias,
          regionStatus,
          excluded: excludedExercises,
          accessoryPreference: profile.accessoryPreference,
          maxCount: liftCap,
          muscleLedger: steeringLedger,
          muscleBands: PER_MUSCLE_BANDS,
          deficitWeight: weekDeficitWeight,
        })
        for (const acc of liftAcc) {
          if (!seenAccNames.has(acc.name)) {
            seenAccNames.add(acc.name)
            allRaw.push(acc)
          }
        }
      }

      // Assign schemes first so the steering ledger can be seeded with each
      // accessory's ACTUAL realized set count (restPause=1, straight=3, myoReps=4,
      // deload-straight=2) rather than a flat estimate. Subsequent sessions in the
      // same week then see accurate accumulated load for deficit/overflow decisions.
      // (Scheme assignment is independent of the steering ledger, so this reorder
      // does not change which scheme an accessory gets — only the ledger value.)
      const accessories = withAccessoryScheme(allRaw, {
        weekIndex: wk.index - 1,
        advanced,
        phase,
        isDeload: wk.isDeload,
      })
      for (const acc of accessories) {
        if (acc.primaryMuscle) addToLedger(steeringLedger, acc.primaryMuscle, acc.scheme.sets.length)
      }

      return { ...s, exercises: kept, accessories, notes }
    })

    // ── Phase 4: per-muscle volume ledger (additive reporting field) ──────────
    // Uses actual scheme.sets.length — independent of the steering estimate ledger.
    const weekLedger = newLedger()
    for (const s of sessions) {
      for (const e of s.exercises) {
        const ex = byName(e.lift)
        if (ex?.primaryMuscle) addToLedger(weekLedger, ex.primaryMuscle, e.sets)
      }
      for (const a of s.accessories) {
        if (a.primaryMuscle) addToLedger(weekLedger, a.primaryMuscle, a.scheme.sets.length)
      }
    }

    return { ...wk, sessions, muscleVolume: summarize(weekLedger) }
  })

  return { template: 'custom', model, weeks }
}
