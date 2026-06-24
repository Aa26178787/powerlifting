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
