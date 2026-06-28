import { describe, it, expect } from 'vitest'
import { QUALITIES, ZONES, DEFAULT_BLEND, PRESETS, normalizeBlend, presetBlend, dominantQuality, weightFor, allocateSets, weeklyQualitySchedule, classifyBlend, HEAVY_FLOOR, strengthShare, restRange } from './quality.js'

describe('constants', () => {
  it('four qualities and zone shapes', () => {
    expect(QUALITIES).toEqual(['power','strength','hypertrophy','endurance'])
    expect(ZONES.strength.reps).toEqual([2,5])
    expect(ZONES.hypertrophy.repAnchor).toBe(9)
    expect(ZONES.power.loading).toBe('pct')
  })
})

describe('normalizeBlend', () => {
  it('scales to sum 1', () => {
    const n = normalizeBlend({ power:0, strength:2, hypertrophy:2, endurance:0 })
    expect(n.strength).toBeCloseTo(0.5, 5)
    expect(n.hypertrophy).toBeCloseTo(0.5, 5)
  })
  it('all-zero falls back to default', () => {
    expect(normalizeBlend({ power:0, strength:0, hypertrophy:0, endurance:0 })).toEqual(DEFAULT_BLEND)
  })
})

describe('presetBlend & dominantQuality', () => {
  it('powerbuilding is strength+hypertrophy', () => {
    expect(presetBlend('powerbuilding')).toEqual({ power:0.10, strength:0.45, hypertrophy:0.45, endurance:0.00 })
    expect(presetBlend('nope')).toBeNull()
  })
  it('dominant of a strength-led blend', () => {
    expect(dominantQuality({ power:0.1, strength:0.7, hypertrophy:0.2, endurance:0 })).toBe('strength')
  })
})

describe('weightFor', () => {
  it('power uses 0.625 of e1rm', () => {
    expect(weightFor('power', 200)).toBe(125) // 200*0.625=125
  })
  it('strength uses RPE via repAnchor (unchanged: rpeTarget 8.5)', () => {
    expect(weightFor('strength', 200)).toBe(175) // 200*pctOf1RM(3,8.5)=87.8% → 175
  })
  it('hypertrophy proximity to failure: rpeTarget 9 → 152.5', () => {
    // 200 * pctOf1RM(9,9)=73.9% * highRepCorrection(9)=1.032 = 152.53 → 152.5
    expect(weightFor('hypertrophy', 200)).toBe(152.5)
  })
})

describe('allocateSets', () => {
  it('sums exactly and is proportional', () => {
    const a = allocateSets(10, { power:0, strength:0.5, hypertrophy:0.4, endurance:0.1 })
    expect(a.strength + a.hypertrophy + a.endurance + a.power).toBe(10)
    expect(a.strength).toBe(5)
    expect(a.hypertrophy).toBe(4)
    expect(a.endurance).toBe(1)
  })
})

describe('weeklyQualitySchedule', () => {
  it('emits the allocated counts ordered strength,power,hyper,endurance', () => {
    const s = weeklyQualitySchedule(6, { power:0, strength:0.5, hypertrophy:0.5, endurance:0 })
    expect(s).toHaveLength(6)
    expect(s.filter((q) => q === 'strength')).toHaveLength(3)
    expect(s.filter((q) => q === 'hypertrophy')).toHaveLength(3)
    expect(s[0]).toBe('strength') // strength first
  })
})

describe('strengthShare (TDD cases 1-4)', () => {
  // Case 1: PL → 0.778
  it('PL blend → strengthShare ≈ 0.778 (str 0.70 / (str 0.70 + hyp 0.20))', () => {
    expect(strengthShare(PRESETS.powerlifting)).toBeCloseTo(0.778, 2)
  })
  // Case 2: PB → 0.50
  it('PB blend → strengthShare === 0.5 (balanced str/hyp)', () => {
    expect(strengthShare(PRESETS.powerbuilding)).toBe(0.5)
  })
  // Case 3: hyp-heavy → clamped to HEAVY_FLOOR 0.40
  it('hyp-dominant blend (str 0.1/hyp 0.9) → clamped at HEAVY_FLOOR', () => {
    expect(strengthShare({ strength: 0.1, hypertrophy: 0.9, power: 0, endurance: 0 })).toBe(HEAVY_FLOOR)
  })
  // Case 4: determinism
  it('deterministic: same input produces same output on two calls', () => {
    const a = strengthShare(PRESETS.powerbuilding)
    const b = strengthShare(PRESETS.powerbuilding)
    expect(a).toBe(b)
  })
})

describe('classifyBlend', () => {
  it('clear strength dominant is not mixed', () => {
    expect(classifyBlend({ power:0.1, strength:0.7, hypertrophy:0.2, endurance:0 }).isMixed).toBe(false)
  })
  it('near-equal top two is mixed (gap <= MIX_GAP)', () => {
    expect(classifyBlend({ power:0, strength:0.57, hypertrophy:0.43, endurance:0 }).isMixed).toBe(true)
  })
  it('no quality above MIX_MAX is mixed', () => {
    expect(classifyBlend({ power:0.1, strength:0.5, hypertrophy:0.3, endurance:0.1 }).isMixed).toBe(true)
  })
  it('returns normalized blend and dominant', () => {
    const c = classifyBlend({ power:0, strength:2, hypertrophy:1, endurance:1 })
    expect(c.dom).toBe('strength')
    expect(c.n.strength).toBeCloseTo(0.5, 5)
  })
})

describe('restRange', () => {
  it('power → { min:3, max:5 }', () => expect(restRange('power')).toEqual({ min:3, max:5 }))
  it('strength → { min:3, max:5 }', () => expect(restRange('strength')).toEqual({ min:3, max:5 }))
  it('hypertrophy → { min:1, max:2 }', () => expect(restRange('hypertrophy')).toEqual({ min:1, max:2 }))
  it('endurance → { min:1, max:1 }', () => expect(restRange('endurance')).toEqual({ min:1, max:1 }))
  it('unknown quality returns a safe default', () => {
    const r = restRange('unknown')
    expect(r.min).toBeGreaterThanOrEqual(1)
    expect(r.max).toBeGreaterThanOrEqual(r.min)
  })
})
