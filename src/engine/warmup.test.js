import { describe, it, expect } from 'vitest'
import { warmupSets } from './warmup.js'

describe('warmupSets', () => {
  it('normal ramp: 3 sets at 40/60/80 % of top, reps 5/3/2, label 워밍업, rpe null', () => {
    const sets = warmupSets(100)
    expect(sets).toHaveLength(3)
    expect(sets[0]).toMatchObject({ weight: 40, reps: 5, rpe: null, label: '워밍업' })
    expect(sets[1]).toMatchObject({ weight: 60, reps: 3, rpe: null, label: '워밍업' })
    expect(sets[2]).toMatchObject({ weight: 80, reps: 2, rpe: null, label: '워밍업' })
  })

  it('rounds weights to the default 2.5 kg increment', () => {
    const sets = warmupSets(162.5)
    expect(sets[0].weight).toBe(65)    // 162.5 * 0.40 = 65.0
    expect(sets[1].weight).toBe(97.5)  // 162.5 * 0.60 = 97.5
    expect(sets[2].weight).toBe(130)   // 162.5 * 0.80 = 130.0
  })

  it('drops warmup sets whose weight >= lightestWorkingWeight', () => {
    // lightest working = 60, top = 100
    // 40 kg < 60 → keep; 60 kg >= 60 → drop; 80 kg >= 60 → drop
    const sets = warmupSets(100, { lightestWorkingWeight: 60 })
    expect(sets).toHaveLength(1)
    expect(sets[0].weight).toBe(40)
  })

  it('all warmup weights are strictly lighter than the lightest working set', () => {
    const sets = warmupSets(200, { lightestWorkingWeight: 170 })
    expect(sets.every((s) => s.weight < 170)).toBe(true)
  })

  it('very light top weight (<= 20 kg) returns []', () => {
    expect(warmupSets(20)).toHaveLength(0)
    expect(warmupSets(15)).toHaveLength(0)
    expect(warmupSets(0)).toHaveLength(0)
  })

  it('non-finite top weight returns []', () => {
    expect(warmupSets(NaN)).toHaveLength(0)
    expect(warmupSets(Infinity)).toHaveLength(0)
  })

  it('custom increment is applied', () => {
    const sets = warmupSets(100, { increment: 5 })
    expect(sets[0].weight).toBe(40)
    expect(sets[1].weight).toBe(60)
    expect(sets[2].weight).toBe(80)
  })

  it('ascending-pyramid case: 60 %+ warmup sets dropped when lightest working set is low', () => {
    // top = 200, lightest = 120 (60 % of top, exact 2.5 multiple)
    // roundToIncrement(200*0.40, 2.5) = 80  < 120 → keep
    // roundToIncrement(200*0.60, 2.5) = 120 >= 120 → drop
    // roundToIncrement(200*0.80, 2.5) = 160 >= 120 → drop
    const sets = warmupSets(200, { lightestWorkingWeight: 120 })
    expect(sets).toHaveLength(1)
    expect(sets[0].weight).toBe(80)
  })
})
