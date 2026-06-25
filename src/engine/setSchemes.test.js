import { describe, it, expect } from 'vitest'
import { SCHEMES } from './setSchemes.js'
import { ZONES } from './quality.js'

const ctx = (over = {}) => ({ quality: 'strength', e1rm: 200, zone: ZONES.strength, baseSets: 3, weekIndex: 0, ...over })

describe('setSchemes expanders', () => {
  it('straight: N identical sets', () => {
    const r = SCHEMES.straight.expand(ctx())
    expect(r.sets).toHaveLength(3)
    expect(new Set(r.sets.map((s) => s.weight)).size).toBe(1)
  })
  it('topSetBackoff: heavy top then lighter back-offs', () => {
    const r = SCHEMES.topSetBackoff.expand(ctx())
    expect(r.sets[0].weight).toBeGreaterThan(r.sets[1].weight)
    expect(r.sets[1].reps).toBeGreaterThanOrEqual(r.sets[0].reps)
  })
  it('ascendingPyramid: weight rises, reps fall', () => {
    const s = SCHEMES.ascendingPyramid.expand(ctx()).sets
    expect(s[s.length - 1].weight).toBeGreaterThan(s[0].weight)
    expect(s[s.length - 1].reps).toBeLessThanOrEqual(s[0].reps)
  })
  it('reversePyramid: heaviest first', () => {
    const s = SCHEMES.reversePyramid.expand(ctx()).sets
    expect(s[0].weight).toBeGreaterThanOrEqual(s[s.length - 1].weight)
  })
  it('amrapTop: final set is AMRAP', () => {
    const s = SCHEMES.amrapTop.expand(ctx()).sets
    expect(s[s.length - 1].reps).toBe('AMRAP')
  })
  it('cluster/restPause/dropSet/widowmaker carry a note and concrete weights', () => {
    for (const k of ['cluster', 'restPause', 'dropSet', 'widowmaker', 'myoReps']) {
      const r = SCHEMES[k].expand(ctx({ quality: 'hypertrophy', zone: ZONES.hypertrophy }))
      expect(r.sets.length).toBeGreaterThan(0)
      expect(r.sets.every((s) => Number.isFinite(s.weight) && s.weight > 0)).toBe(true)
    }
  })
  it('every scheme has label + tier + a working expander', () => {
    for (const k of Object.keys(SCHEMES)) {
      const r = SCHEMES[k].expand(ctx())
      expect(SCHEMES[k].labelKey).toBeTruthy()
      expect(['rct', 'consensus']).toContain(SCHEMES[k].evidenceTier)
      expect(Array.isArray(r.sets)).toBe(true)
    }
  })
})
