import { describe, it, expect } from 'vitest'
import { SCHEMES, pickScheme, expandAccessory } from './setSchemes.js'
import { ZONES } from './quality.js'

const ctx = (over = {}) => ({ quality: 'strength', e1rm: 200, zone: ZONES.strength, baseSets: 3, weekIndex: 0, ...over })

describe('setSchemes expanders', () => {
  it('straight: N same-weight sets with RPE ramping to the target (fatigue)', () => {
    const r = SCHEMES.straight.expand(ctx({ baseSets: 4 }))
    expect(r.sets).toHaveLength(4)
    expect(new Set(r.sets.map((s) => s.weight)).size).toBe(1)   // same load
    expect(r.sets[3].rpe).toBe(ZONES.strength.rpeTarget)        // last set = target
    expect(r.sets[0].rpe).toBeLessThan(r.sets[3].rpe)           // earlier sets easier
  })
  it('straight (legacy shape) still returns baseSets sets', () => {
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

describe('pickScheme', () => {
  it('accessory hypertrophy cycles intensity techniques by week', () => {
    const keys = [0,1,2,3].map((w) => pickScheme({ quality:'hypertrophy', role:'accessory', phase:'accumulation', advanced:true, weekIndex:w }))
    expect(keys[0]).toBe('straight')
    expect(new Set(keys).size).toBeGreaterThan(1)
  })
  it('power comp in intensification favors cluster/contrast for advanced', () => {
    expect(['cluster','contrastPAP','topSingleBackoff']).toContain(
      pickScheme({ quality:'power', role:'comp', phase:'intensification', advanced:true, weekIndex:0 }))
  })
  it('drops advancedOnly schemes for novices (falls back)', () => {
    const k = pickScheme({ quality:'power', role:'comp', phase:'intensification', advanced:false, weekIndex:0 })
    expect(k).not.toBe('cluster'); expect(k).not.toBe('contrastPAP')
  })
  it('strength peak uses peaking schemes', () => {
    expect(['topSingleBackoff','ramping']).toContain(
      pickScheme({ quality:'strength', role:'comp', phase:'peak', advanced:true, weekIndex:0 }))
  })
})

describe('expandAccessory (reps + RPE, no weight)', () => {
  it('straight: baseSets rep sets, no weight, RPE rises to the target on the last set', () => {
    const r = expandAccessory('straight', { quality: 'hypertrophy', baseSets: 3 })
    expect(r.sets).toHaveLength(3)
    expect(r.sets.every((s) => Number.isFinite(s.reps) && s.weight === undefined)).toBe(true)
    expect(r.sets[r.sets.length - 1].rpe).toBe(8)         // last set hits the target
    expect(r.sets[0].rpe).toBeLessThan(r.sets[2].rpe)     // ramps up
  })
  it('endurance straight uses higher reps', () => {
    expect(expandAccessory('straight', { quality: 'endurance' }).sets[0].reps).toBe(15)
  })
  it('restPause / dropSet / myoReps / widowmaker each yield rep-based sets with a note', () => {
    for (const k of ['restPause', 'dropSet', 'myoReps', 'widowmaker']) {
      const r = expandAccessory(k, { quality: 'hypertrophy' })
      expect(r.sets.length).toBeGreaterThan(0)
      expect(r.sets.every((s) => s.reps != null && s.weight === undefined)).toBe(true)
    }
  })
  it('widowmaker is a single 20-rep set', () => {
    const r = expandAccessory('widowmaker', {})
    expect(r.sets).toHaveLength(1)
    expect(r.sets[0].reps).toBe(20)
  })
  it('unknown key falls back to straight', () => {
    expect(expandAccessory('nonsense', { baseSets: 2 }).sets).toHaveLength(2)
  })
})
