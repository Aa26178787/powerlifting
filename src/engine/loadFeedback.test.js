import { describe, it, expect } from 'vitest'
import { FB, logE1rm, liftEntries, effectiveLiftE1rm, effectiveLifts } from './loadFeedback.js'
import { MAIN_LIFTS } from './exercises.js'
import { resolveE1rm } from './generate.js'

// RPE chart spot-checks (rpeChart.json):
//   pctOf1RM(1, 10) = 100%  → e1rmFrom(w, 1, 10) = w
//   pctOf1RM(12, 10) = 69.6% → e1rmFrom(w, 12, 10) = w / 0.696

describe('FB constants', () => {
  it('exports expected values', () => {
    expect(FB.ALPHA).toBe(0.3)
    expect(FB.STEP_UP).toBe(0.05)
    expect(FB.STEP_DOWN).toBe(0.10)
    expect(FB.CAP_UP).toBe(0.15)
    expect(FB.CAP_DOWN).toBe(0.20)
  })
})

// ── logE1rm ───────────────────────────────────────────────────────────────────

describe('logE1rm', () => {
  it('valid entry (reps=1, rpe=10) → e1rm equals weight exactly', () => {
    expect(logE1rm({ weight: 100, reps: 1, rpe: 10 })).toBeCloseTo(100, 5)
  })
  it('negative weight → null', () => {
    expect(logE1rm({ weight: -1, reps: 1, rpe: 10 })).toBeNull()
  })
  it('zero weight → null', () => {
    expect(logE1rm({ weight: 0, reps: 1, rpe: 10 })).toBeNull()
  })
  it('NaN weight → null', () => {
    expect(logE1rm({ weight: NaN, reps: 1, rpe: 10 })).toBeNull()
  })
  it('invalid rpe (11) → null via try/catch on e1rmFrom throw', () => {
    expect(logE1rm({ weight: 100, reps: 1, rpe: 11 })).toBeNull()
  })
  it('invalid rpe (5) → null via try/catch', () => {
    expect(logE1rm({ weight: 100, reps: 1, rpe: 5 })).toBeNull()
  })
  it('reps > 12 clamped to 12 — does not throw', () => {
    const r = logE1rm({ weight: 100, reps: 15, rpe: 10 })
    expect(r).not.toBeNull()
    // pctOf1RM(12, 10) = 69.6% → 100/0.696
    expect(r).toBeCloseTo(100 / 0.696, 2)
  })
  it('reps 0 clamped to 1', () => {
    const r = logE1rm({ weight: 100, reps: 0, rpe: 10 })
    expect(r).not.toBeNull()
    expect(r).toBeCloseTo(100, 5) // pctOf1RM(1,10)=100%
  })
})

// ── liftEntries ───────────────────────────────────────────────────────────────

describe('liftEntries', () => {
  // ts values are deliberately out of order to prove sort ignores them
  const log = [
    { lift: 'squat', week: 2, day: 1, weight: 100, reps: 1, rpe: 10, flag: null,   ts: 5 },
    { lift: 'squat', week: 1, day: 2, weight: 90,  reps: 1, rpe: 10, flag: null,   ts: 1 },
    { lift: 'bench', week: 1, day: 1, weight: 80,  reps: 1, rpe: 10, flag: null,   ts: 2 },
    { lift: 'squat', week: 1, day: 1, weight: 95,  reps: 1, rpe: 10, flag: 'pain', ts: 3 },
    { lift: 'squat', week: 3, day: 1, weight: 105, reps: 1, rpe: 10, flag: 'cut',  ts: 4 },
    { lift: 'squat', week: 4, day: 1, weight: 102, reps: 1, rpe: 10, flag: 'miss', ts: 6 },
  ]

  it('filters by lift — bench gets only bench entries', () => {
    expect(liftEntries(log, 'bench')).toHaveLength(1)
    expect(liftEntries(log, 'deadlift')).toHaveLength(0)
  })
  it('excludes flag=pain', () => {
    const entries = liftEntries(log, 'squat')
    expect(entries.every((e) => e.flag !== 'pain')).toBe(true)
  })
  it('excludes flag=cut', () => {
    const entries = liftEntries(log, 'squat')
    expect(entries.every((e) => e.flag !== 'cut')).toBe(true)
  })
  it('keeps flag=miss and flag=null (3 squat entries remain)', () => {
    // week1/day2(null), week2/day1(null), week4/day1(miss) — pain and cut removed
    expect(liftEntries(log, 'squat')).toHaveLength(3)
  })
  it('sorts by (week,day) ascending — ts values are ignored', () => {
    const entries = liftEntries(log, 'squat')
    expect(entries[0]).toMatchObject({ week: 1, day: 2 })
    expect(entries[1]).toMatchObject({ week: 2, day: 1 })
    expect(entries[2]).toMatchObject({ week: 4, day: 1 })
  })
  it('empty liftLog → []', () => {
    expect(liftEntries([], 'squat')).toEqual([])
  })
  it('undefined liftLog defaults to [] — no crash', () => {
    expect(liftEntries(undefined, 'squat')).toEqual([])
  })
})

// ── effectiveLiftE1rm ─────────────────────────────────────────────────────────

describe('effectiveLiftE1rm', () => {
  const seed = 100

  // Case 1 — identity
  it('empty entries → seed unchanged', () => {
    expect(effectiveLiftE1rm(seed, [])).toBe(seed)
  })
  it('default entries arg → seed unchanged', () => {
    expect(effectiveLiftE1rm(seed)).toBe(seed)
  })

  // Case 2 — single easy log, rise ≤ α·STEP_UP
  it('single easy log (obs +10% above seed) → rise ≤ α·STEP_UP ≈ +1.5%', () => {
    // obs=110, hi=105, clamped=105, est=100+0.3*5=101.5
    const entry = { weight: 110, reps: 1, rpe: 10, lift: 'squat', week: 1, day: 1, flag: null }
    const result = effectiveLiftE1rm(seed, [entry])
    expect(result).toBeCloseTo(101.5, 4)
    expect(result - seed).toBeLessThanOrEqual(seed * FB.ALPHA * FB.STEP_UP + 1e-9)
  })

  // Case 3 — outlier absorbed by per-obs clamp
  it('outlier (weight×10) → per-obs clamp absorbs it, same result as +5% entry', () => {
    const entry = { weight: 1000, reps: 1, rpe: 10, lift: 'squat', week: 1, day: 1, flag: null }
    const result = effectiveLiftE1rm(seed, [entry])
    expect(result).toBeCloseTo(101.5, 4) // clamped identical to weight=110 path
    expect(result).toBeLessThanOrEqual(seed * (1 + FB.CAP_UP) + 1e-9)
  })

  // Case 4 — cumulative CAP_UP
  it('20 up-pulls → stops exactly at CAP_UP (+15%)', () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({
      weight: 9999, reps: 1, rpe: 10, lift: 'squat', week: 1, day: i + 1, flag: null,
    }))
    const result = effectiveLiftE1rm(seed, entries)
    expect(result).toBeCloseTo(seed * (1 + FB.CAP_UP), 5) // 115.0
  })

  // Case 5 — reps > 12 clamped (entry processed, not skipped)
  it('reps=15 → clamped to 12 → obs computed normally (entry not skipped)', () => {
    const entry = { weight: 100, reps: 15, rpe: 10, lift: 'squat', week: 1, day: 1, flag: null }
    const result = effectiveLiftE1rm(seed, [entry])
    // obs = 100/0.696 ≈ 143.68, clamped to hi=105, EWMA → 101.5 (same as outlier path)
    expect(result).toBeCloseTo(101.5, 2)
  })

  // Case 6a — invalid rpe → skip
  it('bad RPE (11) → logE1rm returns null → entry skipped → returns seed', () => {
    const entry = { weight: 200, reps: 1, rpe: 11, lift: 'squat', week: 1, day: 1, flag: null }
    expect(effectiveLiftE1rm(seed, [entry])).toBe(seed)
  })

  // Case 6b — invalid weight → skip
  it('negative weight → logE1rm returns null → entry skipped → returns seed', () => {
    const entry = { weight: -100, reps: 1, rpe: 10, lift: 'squat', week: 1, day: 1, flag: null }
    expect(effectiveLiftE1rm(seed, [entry])).toBe(seed)
  })

  // Case 8a — suppressUp blocks upward
  it('suppressUp:true + easy obs → result = seed (up blocked)', () => {
    const entry = { weight: 110, reps: 1, rpe: 10, lift: 'squat', week: 1, day: 1, flag: null }
    // hi = est*(1+0)=100, obs=110 clamped to 100, EWMA: 100+0.3*0=100, ceil=100 → seed
    const result = effectiveLiftE1rm(seed, [entry], { suppressUp: true })
    expect(result).toBe(seed)
  })

  // Case 8b — suppressUp still allows downward
  it('suppressUp:true + hard obs (below seed) → result < seed (down allowed)', () => {
    // obs=80, hi=100(no up), lo=90, clamped=90, est=100+0.3*(90-100)=97, ceil=100, floor=80 → 97
    const entry = { weight: 80, reps: 1, rpe: 10, lift: 'squat', week: 1, day: 1, flag: null }
    const result = effectiveLiftE1rm(seed, [entry], { suppressUp: true })
    expect(result).toBeCloseTo(97, 4)
    expect(result).toBeLessThan(seed)
  })
})

// ── effectiveLifts ────────────────────────────────────────────────────────────

describe('effectiveLifts', () => {
  const formLifts = {
    squat:    { oneRM: 100 },
    bench:    { oneRM: 80 },
    deadlift: { oneRM: 120 },
  }
  const resolveSeed = (liftInput) => liftInput.oneRM

  it('empty liftLog → all lifts return seed (identity)', () => {
    const out = effectiveLifts([], formLifts, resolveSeed)
    expect(out.squat.oneRM).toBe(100)
    expect(out.bench.oneRM).toBe(80)
    expect(out.deadlift.oneRM).toBe(120)
  })

  it('covers all MAIN_LIFTS with oneRM property', () => {
    const out = effectiveLifts([], formLifts, resolveSeed)
    for (const lift of MAIN_LIFTS) {
      expect(out).toHaveProperty(lift)
      expect(out[lift]).toHaveProperty('oneRM')
    }
  })

  it('squat-only log affects squat, bench and deadlift unchanged', () => {
    const liftLog = [
      { lift: 'squat', week: 1, day: 1, weight: 110, reps: 1, rpe: 10, flag: null },
    ]
    const out = effectiveLifts(liftLog, formLifts, resolveSeed)
    expect(out.squat.oneRM).toBeCloseTo(101.5, 4)
    expect(out.bench.oneRM).toBe(80)
    expect(out.deadlift.oneRM).toBe(120)
  })

  it('case 7: flag=pain → liftEntries excludes entry → squat.oneRM = seed', () => {
    const liftLog = [
      { lift: 'squat', week: 1, day: 1, weight: 110, reps: 1, rpe: 10, flag: 'pain' },
    ]
    const out = effectiveLifts(liftLog, formLifts, resolveSeed)
    expect(out.squat.oneRM).toBe(100) // pain excluded → identity
  })

  // Case 9 — (week,day) sort determinism; ts and array order are irrelevant
  it('(week,day) sort is ts-independent: reversed input array → same result', () => {
    // Two squat entries where processing order matters for EWMA:
    // week1/day1: weight=97 (obs=97, slightly below seed=100)
    // week2/day1: weight=103 (obs=103, slightly above mid-est)
    // ts values deliberately reversed so array order ≠ week/day order
    const liftLog = [
      { lift: 'squat', week: 2, day: 1, weight: 103, reps: 1, rpe: 10, flag: null, ts: 1 },
      { lift: 'squat', week: 1, day: 1, weight: 97,  reps: 1, rpe: 10, flag: null, ts: 9999 },
    ]
    // Expected (week,day) order: week1 first, week2 second:
    // est0=100, obs=97(unclamped), est1=100+0.3*(97-100)=99.1
    // obs=103(unclamped), est2=99.1+0.3*(103-99.1)=100.27
    const forward  = effectiveLifts(liftLog, formLifts, resolveSeed)
    const reversed = effectiveLifts([...liftLog].reverse(), formLifts, resolveSeed)
    expect(forward.squat.oneRM).toBeCloseTo(100.27, 4)
    expect(reversed.squat.oneRM).toBeCloseTo(forward.squat.oneRM, 10)
  })

  it('integrates with resolveE1rm from generate.js (oneRM path)', () => {
    const out = effectiveLifts([], formLifts, resolveE1rm)
    expect(out.squat.oneRM).toBe(100)
  })
})
