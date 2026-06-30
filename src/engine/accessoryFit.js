// Accessory fit-judge (Feature 4) — PURE, ADVISORY ONLY.
//
// Given a (possibly user-swapped or edited) accessory and the lift it supports,
// returns a reason-coded verdict + ranked alternative suggestions. It NEVER blocks
// a swap, NEVER auto-applies, and NEVER mutates the plan. The verdict is the
// worst severity among the reasons — deliberately NOT a numeric pass/fail score
// (the underlying rubric is a coaching heuristic, not a measured continuum).
//
// Evidence tier: heuristic / coaching-consensus ("근거 약함"). Component weights and
// thresholds are not clinically validated. Disclosed in LimitsPanel.

import { byName } from './exercises.js'
import { emphasis } from './style.js'
import { regionMaxStatus, shouldAvoid } from './regionStatus.js'
import { canonicalToken } from './muscleVolume.js'
import { exercisesForPattern, patternOf } from './movementPattern.js'

// Severity → verdict rank (worst wins).
const SEVERITY_RANK = { block: 3, warn: 2, info: 1, good: 0 }
const VERDICT_BY_SEVERITY = { 3: 'avoid', 2: 'caution', 1: 'ok', 0: 'good' }

// Largest emphasis weight among emphasis-map muscles that the primaryMuscle string
// mentions (mirrors accessories.select's substring match). null = unrelated.
function emphasisWeight(primaryMuscle, weights) {
  const matched = Object.entries(weights)
    .filter(([m]) => (primaryMuscle || '').includes(m))
    .map(([, w]) => w)
  return matched.length ? Math.max(...matched) : null
}

// The stress region (if any) with the worst status — for naming it in the reason.
function worstRegion(ex, regionStatus) {
  let region = null, max = 0
  for (const r of ex.stress ?? []) {
    const s = regionStatus[r] ?? 0
    if (s > max) { max = s; region = r }
  }
  return region
}

/**
 * judgeAccessoryFit({ name, lift, style, regionStatus, quality, muscleSummary, equipment, stickingPoint })
 *   → { verdict, reasons: [{ code, severity, muscle?, region? }], suggestions: [name…] }
 *
 * `muscleSummary` is the per-week summarize() output ({ [canon]: { status } }); optional.
 * All inputs are optional with safe fallbacks — never throws.
 */
export function judgeAccessoryFit({
  name, lift, style = {}, regionStatus = {}, quality,
  muscleSummary = null, equipment = [], stickingPoint = 'none',
} = {}) {
  const ex = byName(name) ?? { name, primaryMuscle: '', stress: [], targetLift: 'general', stickingPoint: 'none' }
  const reasons = []
  const weights = lift ? emphasis(lift, style) : {}
  const primeCanon = canonicalToken((ex.primaryMuscle || '').split('/')[0])

  // 1. Region safety (worst lever).
  const rmax = regionMaxStatus(ex, regionStatus)
  if (rmax === 3) reasons.push({ code: 'regionInjury', severity: 'block', region: worstRegion(ex, regionStatus) })
  else if (rmax === 2) reasons.push({ code: 'regionPain', severity: 'warn', region: worstRegion(ex, regionStatus) })

  // 2. Weekly volume overflow on the prime mover.
  if (primeCanon && muscleSummary?.[primeCanon]?.status === 'over') {
    reasons.push({ code: 'overMrv', severity: 'warn', muscle: primeCanon })
  }

  // 3. Emphasis alignment with the lift's style.
  const w = emphasisWeight(ex.primaryMuscle, weights)
  if (w != null && w > 1) reasons.push({ code: 'emphasisMatch', severity: 'good', muscle: primeCanon })
  else if (w != null && w < 1) reasons.push({ code: 'emphasisOff', severity: 'info', muscle: primeCanon })

  // 4. Sticking-point alignment (rare for accessories, but a strong positive).
  if (stickingPoint && stickingPoint !== 'none' && ex.stickingPoint === stickingPoint) {
    reasons.push({ code: 'stickMatch', severity: 'good' })
  }

  // 5. Targets a different main lift (informational, not wrong).
  if (lift && ex.targetLift !== lift && ex.targetLift !== 'general') {
    reasons.push({ code: 'offTarget', severity: 'info' })
  }

  // Verdict = worst severity present (default ok when nothing notable).
  const worst = reasons.reduce((m, r) => Math.max(m, SEVERITY_RANK[r.severity] ?? 0), 0)
  const hasGood = reasons.some((r) => r.severity === 'good')
  const hasNeg = reasons.some((r) => r.severity === 'warn' || r.severity === 'block')
  const verdict = hasNeg ? VERDICT_BY_SEVERITY[worst] : (hasGood ? 'good' : 'ok')

  return { verdict, reasons, suggestions: suggestAlternatives({ ex, lift, style, regionStatus, equipment, weights }) }
}

/**
 * Up to 3 region-safe, same-pattern alternatives ranked by emphasis match then
 * target-lift relevance then name. Empty when the current pick is already a clean
 * emphasis match (verdict 'good' with no negatives) — handled by the caller via
 * verdict, but we also skip when no better-emphasised option exists.
 */
export function suggestAlternatives({ ex, lift, style = {}, regionStatus = {}, equipment = [], weights = null } = {}) {
  const pat = patternOf(ex.primaryMuscle)
  if (pat === 'other') return []
  const w = weights ?? (lift ? emphasis(lift, style) : {})
  const curWeight = emphasisWeight(ex.primaryMuscle, w) ?? 0
  const pool = exercisesForPattern(pat, equipment)
    .filter((c) => c.name !== ex.name)
    .filter((c) => !shouldAvoid(c, regionStatus))
    .map((c) => ({
      name: c.name,
      ew: emphasisWeight(c.primaryMuscle, w) ?? 0,
      onTarget: lift ? (c.targetLift === lift ? 2 : c.targetLift === 'general' ? 1 : 0) : 0,
    }))
    // Only propose things at least as on-emphasis as the current pick.
    .filter((c) => c.ew >= curWeight)
    .sort((a, b) => b.ew - a.ew || b.onTarget - a.onTarget || a.name.localeCompare(b.name))
  return pool.slice(0, 3).map((c) => c.name)
}
