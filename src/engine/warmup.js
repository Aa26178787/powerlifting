import { roundToIncrement } from './e1rm.js'

// Warmup ramp protocol — consensus/practice tier (not RCT).
// Percentages derived from common barbell coaching practice:
//   Sheiko, RTS warmup guide, Starting Strength warmup protocol.
// Scheme: 40/60/80 % of the top working set × 5/3/2 reps — ramps
// intensity toward the working weight without pre-fatiguing the lifter.
// No RCT confirms the exact 40/60/80 split; this is coaching consensus.
const WARMUP_PCTS = [0.40, 0.60, 0.80]
const WARMUP_REPS = [5, 3, 2]

// Below this top-working-weight (standard Olympic barbell = 20 kg) warmup
// sets are impractical — return no sets.
const MIN_TOP_FOR_WARMUP = 20

/**
 * Returns warmup sets for a main lift given the top working weight.
 *
 * @param {number} topWorkingWeight  Heaviest working set weight (kg).
 * @param {object} [opts]
 * @param {number} [opts.increment=2.5]                   Plate increment to round to.
 * @param {number} [opts.lightestWorkingWeight=topWorkingWeight]
 *   Lightest working-set weight; any warmup set at or above this weight
 *   is dropped so that no warmup set is heavier than any working set.
 * @param {number} [opts.barWeight=20]
 *   Empty-bar weight (kg); computed warmup weights below this are clamped up
 *   to the bar (an empty-bar set), and duplicate weights are de-duplicated —
 *   so a light top working weight never yields a sub-bar "warmup".
 * @returns {Array<{weight:number, reps:number, rpe:null, label:string}>}
 */
export function warmupSets(topWorkingWeight, { increment = 2.5, lightestWorkingWeight = topWorkingWeight, barWeight = 20 } = {}) {
  if (!Number.isFinite(topWorkingWeight) || topWorkingWeight <= MIN_TOP_FOR_WARMUP) return []
  const sets = []
  const seen = new Set()
  for (let i = 0; i < WARMUP_PCTS.length; i++) {
    const w = Math.max(barWeight, roundToIncrement(topWorkingWeight * WARMUP_PCTS[i], increment))
    if (w >= lightestWorkingWeight) continue  // warmup must be lighter than all working sets
    if (seen.has(w)) continue                  // de-dup after bar clamp (e.g. two sub-bar pcts → one bar set)
    seen.add(w)
    sets.push({ weight: w, reps: WARMUP_REPS[i], rpe: null, label: '워밍업' })
  }
  return sets
}
