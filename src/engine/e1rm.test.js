import { describe, it, expect } from 'vitest'
import { pctOf1RM, e1rmFrom, epley, brzycki, roundToIncrement, workingWeight } from './e1rm.js'

describe('pctOf1RM', () => {
  it('returns the Tuchscherer cell for 5 reps @ RPE 8', () => {
    expect(pctOf1RM(5, 8)).toBe(81.1)
  })
  it('returns 100 for 1 rep @ RPE 10', () => {
    expect(pctOf1RM(1, 10)).toBe(100)
  })
  it('throws on out-of-range reps', () => {
    expect(() => pctOf1RM(13, 8)).toThrow()
  })
  it('throws on invalid RPE', () => {
    expect(() => pctOf1RM(5, 8.2)).toThrow()
  })
})

describe('e1rmFrom', () => {
  it('estimates 1RM from a weight x reps @ RPE', () => {
    expect(e1rmFrom(325, 5, 8)).toBeCloseTo(400.74, 1)
  })
})

describe('epley & brzycki', () => {
  it('epley 100x5 = 116.67', () => { expect(epley(100, 5)).toBeCloseTo(116.67, 1) })
  it('brzycki 100x5 = 112.5', () => { expect(brzycki(100, 5)).toBeCloseTo(112.5, 1) })
})

describe('roundToIncrement & workingWeight', () => {
  it('rounds to nearest 2.5', () => { expect(roundToIncrement(324.4)).toBe(325) })
  it('computes working weight for 5 reps @ RPE 8 from a 400 e1RM', () => {
    expect(workingWeight(400, 5, 8)).toBe(325) // 400*0.811=324.4 -> 325
  })
})
