import { describe, it, expect } from 'vitest'
import { e1rmBand, acwr, dailyLoads, trainingMonotony, trainingStrain, fitnessFatigue, predictPeakDay } from './analytics.js'

describe('e1rmBand', () => {
  it('±20% band around point', () => {
    expect(e1rmBand(200)).toEqual({ low: 160, point: 200, high: 240 })
  })
  it('null on bad input', () => {
    expect(e1rmBand(0)).toBeNull(); expect(e1rmBand(NaN)).toBeNull()
  })
})

describe('dailyLoads', () => {
  it('groups by (week,day), sums rpe*reps, ordered', () => {
    const log = [
      { week: 1, day: 1, rpe: 8, reps: 3 },   // 24
      { week: 1, day: 1, rpe: 8, reps: 5 },   // +40 = 64
      { week: 1, day: 2, rpe: 9, reps: 2 },   // 18
    ]
    expect(dailyLoads(log)).toEqual([64, 18])
  })
  it('non-finite rpe/reps contribute 0', () => {
    expect(dailyLoads([{ week: 1, day: 1, rpe: null, reps: 5 }])).toEqual([0])
  })
})

describe('trainingMonotony / strain', () => {
  it('mean/SD; null when <2 or SD 0', () => {
    expect(trainingMonotony([10])).toBeNull()
    expect(trainingMonotony([10, 10, 10])).toBeNull() // SD 0
    const m = trainingMonotony([10, 20])  // mean 15, popSD 5 → 3.0
    expect(m).toBeCloseTo(3, 5)
  })
  it('strain = total × monotony', () => {
    expect(trainingStrain([10, 20])).toBeCloseTo(30 * 3, 5)
    expect(trainingStrain([10, 10, 10])).toBeNull()
  })
})

describe('fitnessFatigue', () => {
  it('accumulates and decays; performance = k1*fit - k2*fat', () => {
    const { fitness, fatigue, performance } = fitnessFatigue([100], { tau1: 42, tau2: 7, k1: 1, k2: 2 })
    expect(fitness[0]).toBeCloseTo(100, 5)
    expect(fatigue[0]).toBeCloseTo(100, 5)
    expect(performance[0]).toBeCloseTo(1 * 100 - 2 * 100, 5) // -100
  })
  it('fatigue decays faster than fitness after load stops', () => {
    const { fitness, fatigue } = fitnessFatigue([100, 0, 0, 0, 0, 0, 0, 0])
    // after a week of zero load, fatigue (tau2=7) has decayed more than fitness (tau1=42)
    expect(fatigue[7] / fatigue[0]).toBeLessThan(fitness[7] / fitness[0])
  })
})

describe('predictPeakDay', () => {
  it('a fatigued series peaks after some zero-load taper (offset > 0)', () => {
    const loads = Array.from({ length: 14 }, () => 100) // heavy block
    const offset = predictPeakDay(loads, { horizon: 28 })
    expect(offset).toBeGreaterThan(0)
    expect(offset).toBeLessThanOrEqual(28)
  })
  it('null on empty', () => expect(predictPeakDay([])).toBeNull())
})

describe('acwr', () => {
  it('null when fewer than chronic days', () => {
    expect(acwr(Array.from({ length: 10 }, () => 50))).toBeNull()
  })
  it('ratio of acute mean to chronic mean', () => {
    const loads = Array.from({ length: 28 }, () => 50)
    expect(acwr(loads)).toBeCloseTo(1, 5)
  })
})
