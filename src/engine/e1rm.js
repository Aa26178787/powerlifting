import chart from '../data/rpeChart.json' with { type: 'json' }

const VALID_RPE = new Set([6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10])

export function pctOf1RM(reps, rpe) {
  if (!Number.isInteger(reps) || reps < 1 || reps > 12) {
    throw new Error(`reps must be an integer 1..12, got ${reps}`)
  }
  if (!VALID_RPE.has(rpe)) {
    throw new Error(`rpe must be one of 6..10 in 0.5 steps, got ${rpe}`)
  }
  return chart[String(reps)][String(rpe)]
}

export function e1rmFrom(weight, reps, rpe) {
  return weight / (pctOf1RM(reps, rpe) / 100)
}

export function epley(weight, reps) {
  return weight * (1 + reps / 30)
}

export function brzycki(weight, reps) {
  return weight * 36 / (37 - reps)
}

export function roundToIncrement(x, inc = 2.5) {
  return Math.round(x / inc) * inc
}

export function workingWeight(e1rm, reps, rpe, inc = 2.5) {
  return roundToIncrement(e1rm * pctOf1RM(reps, rpe) / 100, inc)
}

// RPE→%1RM charts (Zourdos/RTS) are validated mainly on low-rep sets; at high
// reps lifters under-predict reps-in-reserve, so a charted "RPE 8.5 @ 9-12 reps"
// is too light — true RPE is reached at a HIGHER %1RM. Apply a bounded upward
// correction above 5 reps (+0.8%/rep, capped +6%; ~+2-4 pp at 9-12 reps).
// See docs/research/2026-06-27-powerlifting-vs-powerbuilding-evidence.md (C).
export function highRepCorrection(reps) {
  return Math.min(1.06, 1 + 0.008 * Math.max(0, reps - 5))
}

// RPE-anchored working load with the high-rep correction. Strength reps (<=5)
// are untouched (correction 1.0). Reps clamp to the chart's 1..12 domain.
export function loadForRpe(e1rm, reps, rpe, inc = 2.5) {
  const r = Math.min(12, reps)
  return roundToIncrement(e1rm * (pctOf1RM(r, rpe) / 100) * highRepCorrection(r), inc)
}
