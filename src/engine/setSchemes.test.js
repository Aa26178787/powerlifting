import { describe, it, expect } from 'vitest'
import { SCHEMES, pickScheme, expandAccessory, schemeSeed } from './setSchemes.js'
import { ZONES } from './quality.js'
import { loadForRpe } from './e1rm.js'

const ctx = (over = {}) => ({ quality: 'strength', e1rm: 200, zone: ZONES.strength, baseSets: 3, weekIndex: 0, ...over })

describe('setSchemes expanders', () => {
  it('straight: N same-weight sets with RPE ramping to the target (fatigue)', () => {
    const r = SCHEMES.straight.expand(ctx({ baseSets: 4 }))
    expect(r.sets).toHaveLength(4)
    expect(new Set(r.sets.map((s) => s.weight)).size).toBe(1)   // same load
    expect(r.sets[3].rpe).toBe(ZONES.strength.rpeTarget)        // last set = target
    expect(r.sets.every((s, i) => i === 0 || s.rpe >= r.sets[i - 1].rpe)).toBe(true) // monotonic
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

describe('accessoryOnly: 1-set techniques excluded from main lifts', () => {
  const phases = ['accumulation', 'intensification', 'peak']
  const quals = ['power', 'strength', 'hypertrophy', 'endurance']
  const banned = ['restPause', 'dropSet', 'myoReps', 'widowmaker']
  it('main (non-accessory) roles never get a 1-set technique', () => {
    for (const role of ['comp', 'variation']) {
      for (const quality of quals) {
        for (const phase of phases) {
          for (let w = 0; w < 6; w++) {
            const k = pickScheme({ quality, role, phase, advanced: true, weekIndex: w, seed: 0 })
            expect(banned).not.toContain(k)
          }
        }
      }
    }
  })
  it('accessory role can still use them', () => {
    const k = pickScheme({ quality: 'hypertrophy', role: 'accessory', phase: 'accumulation', advanced: false, weekIndex: 1 })
    // ACCESSORY['hypertrophy'] = ['straight','restPause','dropSet','myoReps']; weekIndex 1 -> 'restPause'
    expect(k).toBe('restPause')
  })
  it('SCHEMES flags the four techniques accessoryOnly', () => {
    for (const k of banned) expect(SCHEMES[k].accessoryOnly).toBe(true)
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

describe('pickScheme concurrent + seed', () => {
  it('concurrent strength prepends strengthHypertrophy', () => {
    const k = pickScheme({ quality:'strength', role:'comp', phase:'accumulation', advanced:false, weekIndex:0, concurrent:true })
    expect(k).toBe('strengthHypertrophy')
  })
  it('non-concurrent strength keeps default candidate', () => {
    const k = pickScheme({ quality:'strength', role:'comp', phase:'accumulation', advanced:false, weekIndex:0 })
    expect(k).toBe('straight')   // CANDIDATES['strength|accumulation'][0]
  })
  it('concurrent does not affect accessories', () => {
    const k = pickScheme({ quality:'strength', role:'accessory', phase:'accumulation', advanced:false, weekIndex:0, concurrent:true })
    expect(k).toBe('straight')
  })
  it('schemeSeed differs by lift', () => {
    expect(schemeSeed('squat','heavy')).toBe(0)
    expect(schemeSeed('bench','heavy')).toBe(1)
    expect(schemeSeed('deadlift','heavy')).toBe(2)
  })
})

describe('strengthHypertrophy scheme', () => {
  it('heavy strength top + hypertrophy-rep backoff in one exercise', () => {
    const { sets } = SCHEMES.strengthHypertrophy.expand({ e1rm: 200, baseSets: 3 })
    expect(sets.length).toBe(3)
    expect(sets[0].reps).toBe(ZONES.strength.reps[0])        // 헤비 탑 저반복
    expect(sets[1].reps).toBe(ZONES.hypertrophy.repAnchor)   // 근비대 백오프
    expect(sets[0].weight).toBeGreaterThan(sets[1].weight)   // 백오프가 더 가벼움
  })
  it('always emits at least a top + one backoff', () => {
    const { sets } = SCHEMES.strengthHypertrophy.expand({ e1rm: 200, baseSets: 1 })
    expect(sets.length).toBe(2)
  })
  it('backoff load is RPE-derived (matches its 9-reps @ RPE 8.5 label), not the old fixed ~0.67', () => {
    const { sets } = SCHEMES.strengthHypertrophy.expand({ e1rm: 200, baseSets: 3 })
    const back = sets[1]
    // consistent with the label: loadForRpe(e1rm, hypertrophy repAnchor, rpeTarget)
    expect(back.weight).toBe(loadForRpe(200, ZONES.hypertrophy.repAnchor, ZONES.hypertrophy.rpeTarget))
    // and heavier than the old fixed 0.67*e1rm it replaced
    expect(back.weight).toBeGreaterThan(200 * 0.67)
    expect(back.weight).toBeLessThan(sets[0].weight) // still a backoff
  })
})
