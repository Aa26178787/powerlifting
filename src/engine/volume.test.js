import { describe, it, expect } from 'vitest'
import { BANDS, yearsProgress, fatigueScale, weeklySets, bandForBlend, ageScale } from './volume.js'

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
