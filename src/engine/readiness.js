function clamp01(x) { return Math.max(0, Math.min(1, x)) }
function round2(x) { return Math.round(x * 100) / 100 }

export const QUALITY_SENSITIVITY = { power: 1.5, strength: 1.0, hypertrophy: 0.7, endurance: 0.5 }

export function readinessScore(checkin) {
  // Guard against missing/non-finite fields so NaN never propagates downstream.
  // A missing field contributes 0.5 (neutral mid-score) rather than poisoning the average.
  const sleep   = Number.isFinite(checkin.sleepHours)       ? clamp01((checkin.sleepHours - 4) / 4)       : 0.5
  const stress  = Number.isFinite(checkin.stress)            ? clamp01((5 - checkin.stress) / 4)           : 0.5
  const fatigue = Number.isFinite(checkin.systemicFatigue)   ? clamp01((5 - checkin.systemicFatigue) / 4)  : 0.5
  return round2((sleep + stress + fatigue) / 3)
}
export function loadFactor(readiness, quality) {
  return round2(1 - (1 - readiness) * 0.10 * (QUALITY_SENSITIVITY[quality] ?? 1))
}
export function setsToDrop(readiness) {
  if (readiness < 0.3) return 2
  if (readiness < 0.5) return 1
  return 0
}
