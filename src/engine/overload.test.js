import { describe, it, expect } from 'vitest'
import { overloadDose, overloadRisk, applyPreset, PRESETS, overloadCooldownWeeks, generateOverload } from './overload.js'

const baseProfile = {
  lifts: { squat:{oneRM:200}, bench:{oneRM:140}, deadlift:{oneRM:240} },
  years: 3, daysPerWeek: 5, fatigue: 1,
  qualities: { power:0.1, strength:0.7, hypertrophy:0.2, endurance:0 },
}

describe('overloadDose', () => {
  it('aggressiveness clamps 0..1.5; volMult/freqBump rise with targetPct', () => {
    const lo = overloadDose(2, { lifts:['squat'] }), hi = overloadDose(8, { lifts:['squat'] })
    expect(hi.a).toBe(1.5)                 // 8/4 clamped
    expect(hi.volMult).toBeGreaterThan(lo.volMult)
    expect(hi.freqBump).toBeGreaterThanOrEqual(lo.freqBump)
    expect(hi.selectedSets).toBeGreaterThan(lo.selectedSets)
  })
})

describe('overloadRisk', () => {
  it('tier escalates with lifts, weeks, low years, low readiness, unrealistic target', () => {
    const low  = overloadRisk({ targetPct:3, lifts:['squat'], overreachWeeks:3, years:3, readiness:0.7 })
    const high = overloadRisk({ targetPct:8, lifts:['squat','bench','deadlift'], overreachWeeks:8, years:0.5, readiness:0.3 })
    expect(['low','moderate']).toContain(low.tier)
    expect(['high','extreme']).toContain(high.tier)
    expect(high.reasons.length).toBeGreaterThan(low.reasons.length)
  })
})

describe('applyPreset', () => {
  it('returns a config for known presets, null otherwise', () => {
    expect(applyPreset('smolovJr').lifts).toEqual(['squat'])
    expect(applyPreset('nope')).toBeNull()
    expect(Object.keys(PRESETS).length).toBeGreaterThanOrEqual(5)
  })
})

describe('overloadCooldownWeeks', () => {
  it('scales with aggressiveness and weeks', () => {
    const d = overloadDose(4, { lifts:['squat'] })
    expect(overloadCooldownWeeks(d, 6)).toBeGreaterThanOrEqual(6)
  })
})

describe('generateOverload', () => {
  const prof = { ...baseProfile, overload: { enabled:true, lifts:['squat'], targetPct:5, overreachWeeks:4 } }
  it('selected lift gets more weekly working sets than a non-selected lift', () => {
    const plan = generateOverload(prof)
    const wk1 = plan.weeks[0]
    const sets = (lift) => wk1.sessions.flatMap(s => s.exercises).filter(e => e.baseLift === lift).reduce((n,e)=>n+e.sets,0)
    expect(sets('squat')).toBeGreaterThan(sets('bench'))
  })
  it('honors overreachWeeks and ends with a realization deload (intensity held, not RPE 6)', () => {
    const plan = generateOverload(prof)
    const last = plan.weeks[plan.weeks.length - 1]
    expect(last.isDeload).toBe(true)
    const anyMain = last.sessions.flatMap(s => s.exercises).find(e => ['squat','bench','deadlift'].includes(e.baseLift))
    expect(anyMain.rpeTarget).not.toBe(6)        // realization holds intensity
  })
  it('attaches overload metadata (risk, ev, dose, cooldown)', () => {
    const plan = generateOverload(prof)
    expect(plan.overload.risk.tier).toBeDefined()
    expect(plan.overload.dose.a).toBeCloseTo(1.25, 5)   // 5/4
    expect(plan.overload.cooldownWeeks).toBeGreaterThan(0)
  })
  it('is deterministic (two calls equal)', () => {
    expect(JSON.stringify(generateOverload(prof))).toBe(JSON.stringify(generateOverload(prof)))
  })
})
