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

describe('contrastPAP evidenceTier (fix 3)', () => {
  it('contrastPAP evidenceTier is consensus not rct (full explosive pairing not yet implemented)', () => {
    expect(SCHEMES.contrastPAP.evidenceTier).toBe('consensus')
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
  it('backoff load is RPE-derived at one RPE below the hyp target (genuine back-off, not too heavy)', () => {
    const { sets } = SCHEMES.strengthHypertrophy.expand({ e1rm: 200, baseSets: 3 })
    const back = sets[sets.length - 1]
    // backoff RPE is hyp target − 1 (was the full hyp target → too taxing after heavy doubles)
    expect(back.weight).toBe(loadForRpe(200, ZONES.hypertrophy.repAnchor, ZONES.hypertrophy.rpeTarget - 1))
    expect(back.weight).toBeGreaterThan(200 * 0.67)
    expect(back.weight).toBeLessThan(sets[0].weight) // still a backoff
  })
})

describe('strengthHypertrophy — heavyShare split (TDD cases 5-9)', () => {
  // Case 5: heavyShare=null (default) → bit-identical to current 1:(N-1) behavior
  it('heavyShare omitted → 1 top + (N-1) backoff, bit-identical (case 5)', () => {
    const { sets } = SCHEMES.strengthHypertrophy.expand({ e1rm: 200, baseSets: 3 })
    expect(sets.length).toBe(3)
    expect(sets[0].reps).toBe(ZONES.strength.reps[0])
    expect(sets[1].reps).toBe(ZONES.hypertrophy.repAnchor)
    expect(sets[2].reps).toBe(ZONES.hypertrophy.repAnchor)
  })
  // Case 6: heavyShare=0.5, baseSets=4 → 2 heavy + 2 moderate
  it('heavyShare:0.5 baseSets:4 → 2 strength-reps + 2 hyp-reps (case 6)', () => {
    const { sets } = SCHEMES.strengthHypertrophy.expand({ e1rm: 200, baseSets: 4, heavyShare: 0.5 })
    expect(sets.length).toBe(4)
    const heavy   = sets.filter(s => s.reps === ZONES.strength.reps[0])
    const moderate = sets.filter(s => s.reps === ZONES.hypertrophy.repAnchor)
    expect(heavy.length).toBe(2)
    expect(moderate.length).toBe(2)
  })
  // Case 7: heavyShare=1.0, baseSets=4 → heavyN clamped to N-1=3 (moderate≥1)
  it('heavyShare:1.0 baseSets:4 → heavyN clamped to 3 (moderate ≥1 guaranteed) (case 7)', () => {
    const { sets } = SCHEMES.strengthHypertrophy.expand({ e1rm: 200, baseSets: 4, heavyShare: 1.0 })
    expect(sets.length).toBe(4)
    const heavy = sets.filter(s => s.reps === ZONES.strength.reps[0])
    expect(heavy.length).toBe(3)
    const mod = sets.filter(s => s.reps === ZONES.hypertrophy.repAnchor)
    expect(mod.length).toBe(1)
  })
  // Case 8: heavyShare=0.0, baseSets=4 → heavyN clamped to 1 (top-end≥1)
  it('heavyShare:0.0 baseSets:4 → heavyN clamped to 1 (top-end ≥1 guaranteed) (case 8)', () => {
    const { sets } = SCHEMES.strengthHypertrophy.expand({ e1rm: 200, baseSets: 4, heavyShare: 0.0 })
    expect(sets.length).toBe(4)
    const heavy = sets.filter(s => s.reps === ZONES.strength.reps[0])
    expect(heavy.length).toBe(1)
    const mod = sets.filter(s => s.reps === ZONES.hypertrophy.repAnchor)
    expect(mod.length).toBe(3)
  })
  // Case 9: top weight invariant — sets[0].weight === r(e1rm*0.92) for all heavyShare
  it('sets[0].weight === r(e1rm*0.92) regardless of heavyShare (case 9)', () => {
    const e1rm = 200
    const expectedTop = Math.round(e1rm * 0.92 / 2.5) * 2.5  // roundToIncrement(184)
    for (const hs of [null, 0, 0.25, 0.5, 0.75, 1.0]) {
      const args = hs == null ? { e1rm, baseSets: 4 } : { e1rm, baseSets: 4, heavyShare: hs }
      const { sets } = SCHEMES.strengthHypertrophy.expand(args)
      expect(sets[0].weight, `heavyShare=${hs}`).toBe(expectedTop)
    }
  })
})

describe('pickScheme — dilution replacement (TDD cases 10-12)', () => {
  // Case 10: concurrent:true, hypShare omitted → week0 fires strengthHypertrophy (existing test preserved)
  it('concurrent:true hypShare omitted → weekIndex 0 returns strengthHypertrophy (case 10)', () => {
    const k = pickScheme({ quality: 'strength', role: 'comp', phase: 'accumulation', advanced: false, weekIndex: 0, concurrent: true })
    expect(k).toBe('strengthHypertrophy')
  })
  // Case 11: concurrent:true, hypShare:0.5, hits=2 → 2/3 weeks get SH (weeks 0,1 fire; week 2 does not)
  it('concurrent:true hypShare:0.5 → weekIndex 0,1 return strengthHypertrophy; 2 does not (case 11)', () => {
    const args = { quality: 'strength', role: 'comp', phase: 'accumulation', advanced: false, concurrent: true, hypShare: 0.5, seed: 0 }
    expect(pickScheme({ ...args, weekIndex: 0 })).toBe('strengthHypertrophy')
    expect(pickScheme({ ...args, weekIndex: 1 })).toBe('strengthHypertrophy')
    expect(pickScheme({ ...args, weekIndex: 2 })).not.toBe('strengthHypertrophy')
  })
  // Case 12: non-concurrent → straight; accessory with concurrent → straight (both preserved)
  it('non-concurrent keeps default candidate; concurrent accessory unaffected (case 12)', () => {
    const nonConc = pickScheme({ quality: 'strength', role: 'comp', phase: 'accumulation', advanced: false, weekIndex: 0 })
    expect(nonConc).toBe('straight')
    const accConc = pickScheme({ quality: 'strength', role: 'accessory', phase: 'accumulation', advanced: false, weekIndex: 0, concurrent: true })
    expect(accConc).toBe('straight')
  })
})

describe('topSingleBackoff — RPE-derived loads (Fix A)', () => {
  it('top single equals loadForRpe(e1rm,1,8.5) not e1rm*0.90', () => {
    const { sets } = SCHEMES.topSingleBackoff.expand({ e1rm: 200, baseSets: 3 })
    expect(sets[0].weight).toBe(loadForRpe(200, 1, 8.5))
    // 0.90×200=180 (old hardcoded); chart-based 93.9%=187.5 (new)
    expect(sets[0].weight).not.toBe(Math.round(200 * 0.90 / 2.5) * 2.5)
  })
  it('backoff equals loadForRpe(e1rm,3,8.0) not top×0.85', () => {
    const { sets } = SCHEMES.topSingleBackoff.expand({ e1rm: 200, baseSets: 3 })
    expect(sets[1].weight).toBe(loadForRpe(200, 3, 8.0))
  })
  it('top single > backoff (top+backoff structure preserved)', () => {
    const { sets } = SCHEMES.topSingleBackoff.expand({ e1rm: 200, baseSets: 3 })
    expect(sets[0].weight).toBeGreaterThan(sets[1].weight)
  })
})

describe('topSetBackoff — RPE-derived backoff (Fix B)', () => {
  it('backoff equals loadForRpe(e1rm, zone.reps[1], zone.rpeTarget-1)', () => {
    const { sets } = SCHEMES.topSetBackoff.expand(ctx())
    const expected = loadForRpe(200, ZONES.strength.reps[1], ZONES.strength.rpeTarget - 1)
    expect(sets[1].weight).toBe(expected)
  })
  it('top > backoff after RPE-derived change', () => {
    const { sets } = SCHEMES.topSetBackoff.expand(ctx())
    expect(sets[0].weight).toBeGreaterThan(sets[1].weight)
  })
  it('backoff rpe RISES to zone.rpeTarget - 1 across the backoff sets', () => {
    const { sets } = SCHEMES.topSetBackoff.expand(ctx())
    const backoffs = sets.slice(1)
    expect(backoffs[backoffs.length - 1].rpe).toBe(ZONES.strength.rpeTarget - 1)   // last set hits the target
    for (let i = 1; i < backoffs.length; i++) expect(backoffs[i].rpe).toBeGreaterThanOrEqual(backoffs[i - 1].rpe)
  })
})

describe('topSingleBackoff — peak phase RPE ramp (Fix C)', () => {
  it('peak top single is heavier than accumulation top single', () => {
    const accum = SCHEMES.topSingleBackoff.expand({ e1rm: 200, baseSets: 3, phase: 'accumulation', weekIndex: 0, totalWeeks: 8 })
    const peakLast = SCHEMES.topSingleBackoff.expand({ e1rm: 200, baseSets: 3, phase: 'peak', weekIndex: 7, totalWeeks: 8 })
    expect(peakLast.sets[0].weight).toBeGreaterThan(accum.sets[0].weight)
  })
  it('top single never exceeds 100% 1RM (RPE capped at 9.5 → chart 97.8% < 100%)', () => {
    const { sets } = SCHEMES.topSingleBackoff.expand({ e1rm: 200, baseSets: 3, phase: 'peak', weekIndex: 7, totalWeeks: 8 })
    expect(sets[0].weight).toBeLessThan(200)
  })
  it('8-week meso numeric proof: top-single ramps in peak, flat elsewhere, bounded', () => {
    // phaseFor(w,8,true): idx 0-2→accum, 3-4→intensification, 5-7→peak
    // peakStart=ceil(0.67*7)=5, peakLen=3 → peakFrac 0, 0.5, 1.0 → topRpe 8.5, 9.0, 9.5
    const phases = ['accumulation','accumulation','accumulation','intensification','intensification','peak','peak','peak']
    const rows = phases.map((phase, w) => {
      const { sets } = SCHEMES.topSingleBackoff.expand({ e1rm: 200, baseSets: 3, phase, weekIndex: w, totalWeeks: 8 })
      return { week: w + 1, phase, weight: sets[0].weight, rpe: sets[0].rpe }
    })
    // Accumulation + intensification: flat at RPE 8.5
    expect(rows[0].weight).toBe(loadForRpe(200, 1, 8.5))   // 187.5 kg (93.75%)
    expect(rows[4].weight).toBe(loadForRpe(200, 1, 8.5))   // intensification unchanged
    // Peak weeks ramp: 8.5 → 9.0 → 9.5
    expect(rows[5].weight).toBe(loadForRpe(200, 1, 8.5))   // week 6: RPE 8.5  → 187.5
    expect(rows[6].weight).toBe(loadForRpe(200, 1, 9.0))   // week 7: RPE 9.0  → 190.0
    expect(rows[7].weight).toBe(loadForRpe(200, 1, 9.5))   // week 8: RPE 9.5  → 195.0
    // All < 100% 1RM
    for (const row of rows) expect(row.weight).toBeLessThan(200)
    // Confirm the ramp within peak
    expect(rows[5].weight).toBeLessThanOrEqual(rows[6].weight)
    expect(rows[6].weight).toBeLessThanOrEqual(rows[7].weight)
    expect(rows[7].weight).toBeGreaterThan(rows[5].weight)
  })
})
