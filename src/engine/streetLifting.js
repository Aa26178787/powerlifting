// Street-lifting block (Feature 5) — weighted dip + weighted pull-up/chin-up.
//
// NOT a 4th MAIN_LIFT (that hardcode threads through layout/frequency/periodization).
// Instead this is an OPT-IN, load-tracked block appended to each generated week.
// Loading runs on a TOTAL-SYSTEM e1RM (sys = k·bodyweight + addedLoad) using the
// existing strength zone + top-set/backoff structure, then converts the prescribed
// system load back to the ADDED (belt) weight the lifter actually loads.
//
// Evidence tier: the top-set+backoff structure is coaching consensus; the
// bodyweight coefficients k (dip 0.95 / pull-up 0.90) and the RPE→%1RM chart
// extrapolation to bodyweight movements are heuristic ("근거 약함"). Disclosed in
// LimitsPanel. Default profile.streetLifting.enabled=false → no `street` key →
// generate() output byte-identical.

import { ZONES } from './quality.js'
import { e1rmFrom, loadForRpe, roundToIncrement } from './e1rm.js'
import { clampBackoffRpe } from './setSchemes.js'
import { loadRamp } from './volume.js'

export const STREET_MICRO_INC = 1.25   // belt/microplate increment (kg)

export const STREET_LIFTS = [
  { key: 'dip',    exercise: 'Dips (weighted)',          label: '가중 딥스',       defaultK: 0.95 },
  { key: 'pullup', exercise: 'Weighted Pull-Up/Chin-Up', label: '가중 풀업/친업',  defaultK: 0.90 },
]

// Total-system e1RM from the moved mass (k·BW + added) at the tested reps/RPE.
export function streetSystemE1rm(k, bodyweight, added, reps, rpe) {
  return e1rmFrom(k * bodyweight + added, reps, rpe)
}

// Convert a prescribed SYSTEM load back to the added (belt) load to wear.
export function addedFromSystem(systemWeight, k, bodyweight) {
  return roundToIncrement(systemWeight - k * bodyweight, STREET_MICRO_INC)
}

function modeFor(added) {
  if (added > 0) return 'belt'
  if (added > -STREET_MICRO_INC) return 'bodyweight'
  return 'assisted'
}

function makeSet(systemWeight, reps, rpe, label, k, bodyweight) {
  const addedWeight = addedFromSystem(systemWeight, k, bodyweight)
  const mode = modeFor(addedWeight)
  const set = { systemWeight, addedWeight, reps, rpe, label, mode }
  if (mode === 'assisted') set.assistKg = Math.abs(addedWeight)
  return set
}

// Expand one street lift into concrete sets. Heavy strength structure: a top double
// (~0.92 sys @ RPE 8.5) + backoff fives at RPE 7.5 (lowered by backoffRpeDrop, same
// [6,10] chart clamp as the main lifts). Deload: light fives at RPE 6, half the sets.
export function expandStreetLift({ sysE1rm, k, bodyweight, baseSets = 4, backoffRpeDrop = 0, isDeload = false }) {
  const z = ZONES.strength
  const mk = (w, reps, rpe, label) => makeSet(w, reps, rpe, label, k, bodyweight)
  if (isDeload) {
    const n = Math.max(1, Math.round(baseSets * 0.5))
    const w = loadForRpe(sysE1rm, z.repAnchor, 6)
    return { type: 'topSetBackoff', sets: Array.from({ length: n }, () => mk(w, z.repAnchor, 6, '디로드')) }
  }
  const top = roundToIncrement(sysE1rm * z.pct[1])
  const backoffRpe = clampBackoffRpe(z.rpeTarget - 1 - backoffRpeDrop)
  const backW = loadForRpe(sysE1rm, z.reps[1], backoffRpe)
  const sets = [mk(top, z.reps[0], z.rpeTarget, '탑')]
  for (let i = 1; i < Math.max(1, baseSets); i++) sets.push(mk(backW, z.reps[1], backoffRpe, '백오프'))
  return { type: 'topSetBackoff', sets }
}

// Build the appended street block for ONE week. Returns [] when disabled, no
// bodyweight, or no lift has complete inputs (added/reps/rpe all present).
export function buildStreetWeek(street, bodyweight, weekIndex = 0, totalWeeks = 3, { backoffRpeDrop = 0, isDeload = false } = {}) {
  if (!street?.enabled || !bodyweight) return []
  const out = []
  for (const def of STREET_LIFTS) {
    const cfg = street[def.key]
    if (!cfg || cfg.added == null || cfg.reps == null || cfg.rpe == null) continue
    const k = street.k?.[def.key] ?? def.defaultK
    const baseE1 = streetSystemE1rm(k, bodyweight, cfg.added, cfg.reps, cfg.rpe)
    // Weekly load ramp on work weeks; deload rebuilds from the unramped base at RPE 6.
    const sysE1rm = isDeload ? baseE1 : baseE1 * loadRamp(weekIndex, totalWeeks)
    const scheme = expandStreetLift({ sysE1rm, k, bodyweight, baseSets: 4, backoffRpeDrop, isDeload })
    out.push({
      lift: def.key, label: def.label, exercise: def.exercise, role: 'street',
      quality: 'strength', bodyweight, k, grip: cfg.grip ?? null,
      scheme: { type: scheme.type, evidenceTier: 'consensus', note: '추가중량 = 벨트 부하 (체중 별도)', sets: scheme.sets },
    })
  }
  return out
}
