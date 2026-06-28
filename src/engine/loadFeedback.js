import { e1rmFrom } from './e1rm.js'
import { MAIN_LIFTS } from './exercises.js'

// Feedback smoothing constants.
// Direction (easy→↑, hard→↓), smoothing, and asymmetric clamping are consensus
// (Helms/RTS·Zourdos overload-recovery model; suppressUp on overreaching is well-supported).
// Exact values (α=0.3, ±5/10%, +15/−20%) are heuristics — see §10 disclosure in spec.
export const FB = {
  ALPHA:     0.3,   // EWMA: one session moves estimate 30% toward observation
  STEP_UP:   0.05,  // per-obs upper clamp +5%  (conservative — overestimate → injury risk)
  STEP_DOWN: 0.10,  // per-obs lower clamp −10% (respond faster on weakness — safety, asymmetric)
  CAP_UP:    0.15,  // cumulative upper cap vs. seed +15%
  CAP_DOWN:  0.20,  // cumulative lower cap vs. seed −20%
}

// One log entry → estimated e1RM.
// reps are clamped to 1..12 (chart domain). Invalid weight or RPE → null (skip).
export function logE1rm({ weight, reps, rpe }) {
  if (!Number.isFinite(weight) || weight <= 0) return null
  const r = Math.min(12, Math.max(1, Math.round(reps)))
  try { return e1rmFrom(weight, r, rpe) } catch { return null }
}

// Filtered, (week,day)-sorted entries for one lift.
// Excludes pain/cut (not strength signals). miss is kept (STEP_DOWN absorbs the noise).
// ts is NEVER used for ordering — determinism requires only {week,day}.
export function liftEntries(liftLog = [], lift) {
  return liftLog
    .filter((e) => e.lift === lift && e.flag !== 'pain' && e.flag !== 'cut')
    .sort((a, b) => (a.week - b.week) || (a.day - b.day))
}

// seed + filtered entries → smoothed, clamped effective e1RM.
// Empty entries → returns seed unchanged (identity — byte-identical empty-log path).
export function effectiveLiftE1rm(seed, entries = [], { suppressUp = false } = {}) {
  if (!entries.length) return seed
  let est = seed
  for (const e of entries) {
    const obs = logE1rm(e)
    if (obs == null) continue
    const hi = est * (1 + (suppressUp ? 0 : FB.STEP_UP))  // block upward when overreaching
    const lo = est * (1 - FB.STEP_DOWN)
    const clamped = Math.min(hi, Math.max(lo, obs))        // per-obs clamp absorbs outliers/typos
    est += FB.ALPHA * (clamped - est)                      // EWMA
  }
  const ceil  = seed * (1 + (suppressUp ? 0 : FB.CAP_UP))
  const floor = seed * (1 - FB.CAP_DOWN)
  return Math.min(ceil, Math.max(floor, est))              // cumulative band vs. seed
}

// All MAIN_LIFTS → effective {lift: {oneRM}} map.
// No rounding here — generate.js rounds at load-calculation time.
export function effectiveLifts(liftLog, formLifts, resolveSeed, opts = {}) {
  const out = {}
  for (const lift of MAIN_LIFTS) {
    const seed = resolveSeed(formLifts[lift])
    out[lift] = { oneRM: effectiveLiftE1rm(seed, liftEntries(liftLog, lift), opts) }
  }
  return out
}
