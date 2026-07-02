// Top-set-anchored backoff (within-session autoregulation).
//
// The prescribed weights are derived from the ENTERED 1RM, which can be stale or
// optimistic → the top set and its RPE-derived backoff feel too heavy. This computes
// the backoff off the lifter's ACTUAL top-set performance instead: today's estimated
// 1RM = e1rmFrom(actual weight, actual reps, actual RPE), then the prescribed backoff
// (reps @ target RPE) is loaded off THAT. If the top set was harder than its target
// (higher actual RPE), today's e1RM — and the backoff — come down automatically.
//
// Pure + display-only: does not mutate the plan or the store.

import { e1rmFrom, loadForRpe } from './e1rm.js'

const clampReps = (r) => Math.min(12, Math.max(1, Math.round(Number(r))))
const clampRpe = (r) => Math.min(10, Math.max(6, Math.round(Number(r) * 2) / 2))   // Tuchscherer chart domain

/**
 * adjustedBackoff({ topWeight, actualReps, actualRpe, backoffReps, backoffRpe })
 *   → { todayE1rm, backoffWeight } | null
 *
 * All inputs required + finite; returns null on invalid input (never throws).
 * reps clamp to the chart's 1..12, RPE to 6..10 (0.5 steps).
 */
export function adjustedBackoff({ topWeight, actualReps, actualRpe, backoffReps, backoffRpe } = {}) {
  const nums = [topWeight, actualReps, actualRpe, backoffReps, backoffRpe].map(Number)
  if (!nums.every((n) => Number.isFinite(n)) || nums[0] <= 0) return null
  const todayE1rm = e1rmFrom(nums[0], clampReps(actualReps), clampRpe(actualRpe))
  const backoffWeight = loadForRpe(todayE1rm, clampReps(backoffReps), clampRpe(backoffRpe))
  return { todayE1rm, backoffWeight }
}
