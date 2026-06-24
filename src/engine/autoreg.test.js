import { describe, it, expect } from 'vitest'
import { loadAdjustment, updateE1rm } from './autoreg.js'

describe('loadAdjustment', () => {
  it('no change when actual matches target', () => {
    expect(loadAdjustment(8, 8, 100)).toBe(100)
  })
  it('adds ~2% per 0.5 RPE when the set was too easy', () => {
    // actual 7 is 1.0 RPE below target 8 -> +4% -> 104 -> round 2.5 -> 105
    expect(loadAdjustment(8, 7, 100)).toBe(105)
  })
  it('reduces load when the set was too hard', () => {
    // actual 9 is 1.0 RPE above target 8 -> -4% -> 96 -> round 2.5 -> 95
    expect(loadAdjustment(8, 9, 100)).toBe(95)
  })
})

describe('updateE1rm', () => {
  it('recomputes e1RM from a realised set', () => {
    // 325 x 5 @ actual RPE 8 -> 325 / 0.811 ~ 400.7
    expect(updateE1rm(325, 5, 8)).toBeCloseTo(400.74, 1)
  })
})
