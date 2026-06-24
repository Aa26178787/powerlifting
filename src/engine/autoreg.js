import { e1rmFrom, roundToIncrement } from './e1rm.js'

export function loadAdjustment(targetRpe, actualRpe, weight) {
  const deltaSteps = (targetRpe - actualRpe) / 0.5 // +ve = too easy -> add load
  const factor = 1 + deltaSteps * 0.02
  return roundToIncrement(weight * factor)
}

export function updateE1rm(weight, reps, actualRpe) {
  return e1rmFrom(weight, reps, actualRpe)
}
