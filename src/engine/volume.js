import { classifyBlend } from './quality.js'

export const BANDS = {
  strength:    { mev: 6,  mav: 10, mrv: 12 },
  balanced:    { mev: 8,  mav: 13, mrv: 18 },
  hypertrophy: { mev: 10, mav: 16, mrv: 22 },
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x))

export function yearsProgress(years) {
  return clamp(years / 5, 0, 1)
}

export function fatigueScale(fatigue) {
  return 1 - (clamp(fatigue, 1, 5) - 1) / 4 * 0.30
}

export function ageScale(age) {
  if (age == null) return 1
  if (age <= 40) return 1
  return clamp(1 - (age - 40) / 20 * 0.15, 0.85, 1)
}

export function bandForBlend(blend) {
  const { dom, isMixed } = classifyBlend(blend)
  if (dom === 'hypertrophy' && !isMixed) return 'hypertrophy'
  if (isMixed) return 'balanced'
  if (dom === 'power' || dom === 'strength') return 'strength'
  return 'balanced'
}

export function weeklySets(blend, years, fatigue, age) {
  const band = BANDS[bandForBlend(blend)]
  // Higher floor: even novices start above MEV (mid of the MEV->MAV range),
  // advanced reach MAV. This is the mesocycle WEEK-1 (floor) volume.
  const base = band.mev + (band.mav - band.mev) * (0.5 + 0.5 * yearsProgress(years))
  const scaled = Math.round(base * fatigueScale(fatigue) * ageScale(age))
  return clamp(scaled, 4, band.mrv)
}

// Weekly volume ramp across the mesocycle: week 1 sits at the floor (weeklySets),
// ramping up ~35% toward MRV by the last working week (progressive overload by
// volume). Capped to MRV downstream. totalWeeks<=1 -> flat.
export function volumeRamp(weekIndex, totalWeeks) {
  if (totalWeeks <= 1) return 1
  return 1 + 0.35 * (weekIndex / (totalWeeks - 1))
}

// Absolute per-session working-set cap for the main lift, regardless of
// weeklySets/frequency. Deadlift is strictest (highest axial/CNS fatigue, slowest
// recovery). Beyond these, added barbell sets are junk volume (stimulus-to-fatigue
// ratio collapses). Consensus-tier heuristic; deadlift-lowest ordering is well
// accepted. See research doc (B, D). Overflow weekly volume is NOT stacked onto
// one session — the honest path is to add a session for that lift.
export const PER_SESSION_CAP = { squat: 6, bench: 8, deadlift: 4 }

// Week-to-week LOAD progression: top-set effective-1RM creeps up to +4% by the
// last working week (linear), giving visible progressive overload at a constant
// target RPE. Bounded; deload resets it. Consensus/textbook step (ACSM 2-10%
// progression principle). See research doc (E). totalWeeks<=1 -> flat.
export function loadRamp(weekIndex, totalWeeks) {
  if (totalWeeks <= 1) return 1
  const MAX = 0.04
  return 1 + MAX * (weekIndex / (totalWeeks - 1))
}
