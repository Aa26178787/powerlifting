import { describe, it, expect } from 'vitest'
import { BANDS, yearsProgress, fatigueScale, weeklySets } from './volume.js'

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

describe('weeklySets', () => {
  it('a fresh strength beginner sits at the MEV', () => {
    expect(weeklySets('strength', 0, 1)).toBe(BANDS.strength.mev) // 6
  })
  it('a 5-year strength lifter (low fatigue) reaches the MAV', () => {
    expect(weeklySets('strength', 5, 1)).toBe(BANDS.strength.mav) // 10
  })
  it('high fatigue reduces volume', () => {
    expect(weeklySets('hypertrophy', 5, 5)).toBe(11) // round(16*0.7)
  })
  it('never drops below the floor of 4', () => {
    expect(weeklySets('strength', 0, 5)).toBeGreaterThanOrEqual(4)
  })
})
