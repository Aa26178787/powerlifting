import { describe, it, expect } from 'vitest'
import { pctOf1RM, e1rmFrom, roundToIncrement, workingWeight, highRepCorrection, loadForRpe } from './e1rm.js'

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

describe('roundToIncrement & workingWeight', () => {
  it('rounds to nearest 2.5', () => { expect(roundToIncrement(324.4)).toBe(325) })
  it('computes working weight for 5 reps @ RPE 8 from a 400 e1RM', () => {
    expect(workingWeight(400, 5, 8)).toBe(325) // 400*0.811=324.4 -> 325
  })
})

describe('highRepCorrection (RPE chart underestimates %1RM at high reps)', () => {
  it('is 1.0 at or below 5 reps (strength range untouched)', () => {
    expect(highRepCorrection(1)).toBe(1)
    expect(highRepCorrection(3)).toBe(1)
    expect(highRepCorrection(5)).toBe(1)
  })
  it('rises above 5 reps and is bounded at +6%', () => {
    expect(highRepCorrection(9)).toBeGreaterThan(1)
    expect(highRepCorrection(9)).toBeLessThanOrEqual(1.06)
    expect(highRepCorrection(20)).toBe(1.06) // capped
  })
  it('adds ~2-4 percentage points at 9-12 reps', () => {
    // 9@8.5 chart = 72.8% -> corrected ~75% (≈ +2.3 pp)
    expect(pctOf1RM(9, 8.5) / 100 * highRepCorrection(9) * 100).toBeGreaterThan(74)
    expect(pctOf1RM(9, 8.5) / 100 * highRepCorrection(9) * 100).toBeLessThan(77)
  })
})

describe('loadForRpe (RPE-anchored load with high-rep correction)', () => {
  it('equals workingWeight for strength reps (<=5, no correction)', () => {
    expect(loadForRpe(200, 3, 8.5)).toBe(workingWeight(200, 3, 8.5))
    expect(loadForRpe(400, 5, 8)).toBe(workingWeight(400, 5, 8))
  })
  it('is heavier than the raw chart for high-rep hypertrophy loads', () => {
    // a "9 reps @ RPE 8.5" set should be heavier than the uncorrected chart cell
    expect(loadForRpe(200, 9, 8.5)).toBeGreaterThan(workingWeight(200, 9, 8.5))
  })
  it('clamps reps to the chart 1..12 domain', () => {
    expect(loadForRpe(200, 16, 8)).toBe(loadForRpe(200, 12, 8))
  })
})
