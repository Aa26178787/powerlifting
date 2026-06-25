import { describe, it, expect } from 'vitest'
import { QUALITIES, ZONES, DEFAULT_BLEND, PRESETS, normalizeBlend, presetBlend, dominantQuality, weightFor, allocateSets, weeklyQualitySchedule } from './quality.js'

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
  it('strength uses RPE via repAnchor', () => {
    // workingWeight(200, 3, 8.5) = 200 * pctOf1RM(3,8.5)/100 = 200*0.878=175.6 -> 175
    expect(weightFor('strength', 200)).toBe(175)
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
