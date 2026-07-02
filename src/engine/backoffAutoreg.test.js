import { describe, it, expect } from 'vitest'
import { adjustedBackoff } from './backoffAutoreg.js'
import { e1rmFrom, loadForRpe } from './e1rm.js'

describe('adjustedBackoff — top-set-anchored backoff', () => {
  it('computes today e1RM from the actual top set, then loads the prescribed backoff off it', () => {
    const r = adjustedBackoff({ topWeight: 185, actualReps: 2, actualRpe: 8.5, backoffReps: 5, backoffRpe: 7.5 })
    expect(r.todayE1rm).toBeCloseTo(e1rmFrom(185, 2, 8.5), 6)
    expect(r.backoffWeight).toBe(loadForRpe(r.todayE1rm, 5, 7.5))
    expect(r.backoffWeight).toBeLessThan(185)   // backoff is lighter than the top
  })
  it('a HARDER top set (higher actual RPE, same weight/reps) → lower today e1RM → lighter backoff', () => {
    const easy = adjustedBackoff({ topWeight: 185, actualReps: 2, actualRpe: 8, backoffReps: 5, backoffRpe: 7.5 })
    const hard = adjustedBackoff({ topWeight: 185, actualReps: 2, actualRpe: 9.5, backoffReps: 5, backoffRpe: 7.5 })
    expect(hard.todayE1rm).toBeLessThan(easy.todayE1rm)
    expect(hard.backoffWeight).toBeLessThanOrEqual(easy.backoffWeight)
  })
  it('clamps reps to 1..12 and RPE to 6..10 (never throws on out-of-domain input)', () => {
    expect(() => adjustedBackoff({ topWeight: 100, actualReps: 20, actualRpe: 5, backoffReps: 30, backoffRpe: 11 })).not.toThrow()
    const r = adjustedBackoff({ topWeight: 100, actualReps: 20, actualRpe: 5, backoffReps: 30, backoffRpe: 11 })
    expect(Number.isFinite(r.backoffWeight)).toBe(true)
  })
  it('invalid / missing input → null', () => {
    expect(adjustedBackoff({ topWeight: 0, actualReps: 2, actualRpe: 8, backoffReps: 5, backoffRpe: 7.5 })).toBeNull()
    expect(adjustedBackoff({ topWeight: 185, actualReps: NaN, actualRpe: 8, backoffReps: 5, backoffRpe: 7.5 })).toBeNull()
    expect(adjustedBackoff({})).toBeNull()
  })
})
