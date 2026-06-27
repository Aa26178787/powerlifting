import { describe, it, expect } from 'vitest'
import { BANDS, yearsProgress, fatigueScale, weeklySets, bandForBlend, ageScale, volumeRamp, volumeRampMode, PER_SESSION_CAP, loadRamp } from './volume.js'

describe('yearsProgress', () => {
  it('is 0 at 0 years and caps at 1 by 5 years', () => {
    expect(yearsProgress(0)).toBe(0)
    expect(yearsProgress(5)).toBe(1)
    expect(yearsProgress(10)).toBe(1)
  })
})

describe('fatigueScale', () => {
  it('is 1.0 at fatigue 1 and 0.7 at fatigue 5', () => {
    expect(fatigueScale(1)).toBeCloseTo(1.0, 5)
    expect(fatigueScale(5)).toBeCloseTo(0.7, 5)
  })
})

describe('bandForBlend', () => {
  it('strength-dominant -> strength band', () => {
    expect(bandForBlend({ power:0.1, strength:0.7, hypertrophy:0.2, endurance:0 })).toBe('strength')
  })
  it('hypertrophy-dominant -> hypertrophy band', () => {
    expect(bandForBlend({ power:0, strength:0.2, hypertrophy:0.8, endurance:0 })).toBe('hypertrophy')
  })
  it('mixed blend -> balanced band', () => {
    expect(bandForBlend({ power:0.1, strength:0.45, hypertrophy:0.45, endurance:0 })).toBe('balanced')
  })
})

describe('weeklySets (blend-keyed)', () => {
  it('strength blend, 5yr, low fatigue hits the strength MAV', () => {
    expect(weeklySets({ power:0, strength:1, hypertrophy:0, endurance:0 }, 5, 1)).toBe(BANDS.strength.mav)
  })
  it('never exceeds MRV', () => {
    const v = weeklySets({ power:0, strength:0, hypertrophy:1, endurance:0 }, 10, 1)
    expect(v).toBeLessThanOrEqual(BANDS.hypertrophy.mrv)
  })
})

describe('ageScale', () => {
  it('is 1.0 up to 40 and tapers to 0.85 by 60', () => {
    expect(ageScale(undefined)).toBe(1)
    expect(ageScale(35)).toBe(1)
    expect(ageScale(40)).toBe(1)
    expect(ageScale(60)).toBeCloseTo(0.85, 5)
    expect(ageScale(80)).toBeCloseTo(0.85, 5)
  })
})

describe('weeklySets age taper', () => {
  it('older athlete gets fewer or equal sets', () => {
    const young = weeklySets({ power:0, strength:0, hypertrophy:1, endurance:0 }, 5, 1, 30)
    const old   = weeklySets({ power:0, strength:0, hypertrophy:1, endurance:0 }, 5, 1, 60)
    expect(old).toBeLessThanOrEqual(young)
    expect(old).toBeLessThan(young)
  })
  it('omitting age preserves legacy value', () => {
    expect(weeklySets({ power:0, strength:1, hypertrophy:0, endurance:0 }, 5, 1)).toBe(BANDS.strength.mav)
  })
})

describe('volumeRamp', () => {
  it('flat at week 1, ramps ~35% by the last week, flat for single week', () => {
    expect(volumeRamp(0, 4)).toBe(1)
    expect(volumeRamp(3, 4)).toBeCloseTo(1.35, 5)
    expect(volumeRamp(0, 1)).toBe(1)
  })
  it('is monotonic across weeks', () => {
    expect(volumeRamp(1, 4)).toBeGreaterThan(volumeRamp(0, 4))
    expect(volumeRamp(2, 4)).toBeGreaterThan(volumeRamp(1, 4))
  })
  // --- mode extension (spec §2) ---
  it('totalWeeks<=1 returns 1 for all modes', () => {
    expect(volumeRamp(0, 1, 'accumulate')).toBe(1)
    expect(volumeRamp(0, 1, 'maintain')).toBe(1)
    expect(volumeRamp(0, 1, 'taper')).toBe(1)
  })
  it('accumulate mode is bit-for-bit identical to 2-arg call', () => {
    for (let w = 0; w < 8; w++) {
      expect(volumeRamp(w, 8, 'accumulate')).toBe(volumeRamp(w, 8))
    }
  })
  it('maintain mode: monotonic, last week ~1.20, always < accumulate at same t>0', () => {
    const N = 4
    for (let w = 1; w < N; w++) {
      expect(volumeRamp(w, N, 'maintain')).toBeGreaterThan(volumeRamp(w - 1, N, 'maintain'))
      expect(volumeRamp(w, N, 'maintain')).toBeLessThan(volumeRamp(w, N, 'accumulate'))
    }
    expect(volumeRamp(N - 1, N, 'maintain')).toBeCloseTo(1.20, 5)
  })
  it('taper mode: non-monotonic (last < peak-boundary)', () => {
    // 4-week: last(w=3) < peak-boundary(w=2, nearest ≤ 2/3)
    expect(volumeRamp(3, 4, 'taper')).toBeLessThan(volumeRamp(2, 4, 'taper'))
    // 8-week: last(w=7) < peak neighbor(w=5, t=5/7≈0.71>2/3 → descending; w=4, t=4/7≈0.57 → ascending)
    expect(volumeRamp(7, 8, 'taper')).toBeLessThan(volumeRamp(4, 8, 'taper'))
  })
  it('taper mode: last week ≈0.55, peak boundary ≈1.15', () => {
    // At t=1 (last week): 0.55
    expect(volumeRamp(3, 4, 'taper')).toBeCloseTo(0.55, 5)
    // At t=2/3 exactly (achievable at N=4, w=2: t=2/3): 1.15
    expect(volumeRamp(2, 4, 'taper')).toBeCloseTo(1.15, 5)
  })
})

describe('weeklySets higher floor', () => {
  it('a novice mixed-blend starts above MEV (not pinned to it)', () => {
    const blend = { power: 0, strength: 0.5, hypertrophy: 0.5, endurance: 0 } // -> balanced band
    expect(weeklySets(blend, 1, 1)).toBeGreaterThan(BANDS.balanced.mev)
  })
})

describe('PER_SESSION_CAP', () => {
  it('caps each main lift, with deadlift strictest (highest axial/CNS fatigue)', () => {
    expect(PER_SESSION_CAP.deadlift).toBeLessThan(PER_SESSION_CAP.squat)
    expect(PER_SESSION_CAP.deadlift).toBeLessThan(PER_SESSION_CAP.bench)
    expect(PER_SESSION_CAP.deadlift).toBe(4)
    expect(PER_SESSION_CAP.squat).toBe(6)
    expect(PER_SESSION_CAP.bench).toBe(8)
  })
})

describe('volumeRampMode', () => {
  const pl   = { power: 0.10, strength: 0.70, hypertrophy: 0.20, endurance: 0.00 } // powerlifting
  const pb   = { power: 0.10, strength: 0.45, hypertrophy: 0.45, endurance: 0.00 } // powerbuilding (mixed)
  const hyp  = { power: 0.00, strength: 0.20, hypertrophy: 0.80, endurance: 0.00 } // hypertrophy-dominant
  const pow  = { power: 0.70, strength: 0.20, hypertrophy: 0.10, endurance: 0.00 } // power-dominant non-mixed

  it('peaking always returns taper, regardless of blend', () => {
    expect(volumeRampMode(pl, true)).toBe('taper')
    expect(volumeRampMode(pb, true)).toBe('taper')
    expect(volumeRampMode(hyp, true)).toBe('taper')
  })
  it('strength-dominant non-mixed + no peaking → maintain', () => {
    expect(volumeRampMode(pl, false)).toBe('maintain')
  })
  it('power-dominant non-mixed + no peaking → maintain', () => {
    expect(volumeRampMode(pow, false)).toBe('maintain')
  })
  it('mixed blend (powerbuilding) + no peaking → accumulate', () => {
    expect(volumeRampMode(pb, false)).toBe('accumulate')
  })
  it('hypertrophy-dominant + no peaking → accumulate', () => {
    expect(volumeRampMode(hyp, false)).toBe('accumulate')
  })
})

describe('loadRamp (bounded weekly load progression)', () => {
  it('flat at week 1, rises to +4% by the last working week, bounded', () => {
    expect(loadRamp(0, 4)).toBe(1)
    expect(loadRamp(3, 4)).toBeCloseTo(1.04, 5)
    expect(loadRamp(0, 1)).toBe(1)        // single week -> flat
  })
  it('is monotonic and never exceeds +4%', () => {
    for (let w = 0; w < 8; w++) {
      expect(loadRamp(w, 8)).toBeLessThanOrEqual(1.04)
      if (w > 0) expect(loadRamp(w, 8)).toBeGreaterThanOrEqual(loadRamp(w - 1, 8))
    }
  })
})
