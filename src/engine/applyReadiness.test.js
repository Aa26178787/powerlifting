import { describe, it, expect } from 'vitest'
import { applyReadiness } from './applyReadiness.js'

const mk = (over = {}) => ({
  day: 1,
  exercises: [{
    lift: 'Back Squat (High Bar)', baseLift: 'squat', quality: 'strength',
    scheme: { type: 'topSetBackoff', evidenceTier: 'consensus', sets: [
      { weight: 160, reps: 3, rpe: 9 }, { weight: 140, reps: 5 }, { weight: 140, reps: 5 },
    ] }, sets: 3,
  }],
  accessories: [{ name: 'leg press', quality: 'hypertrophy', scheme: { type: 'straight', evidenceTier: 'rct', sets: [{ reps: 10 }, { reps: 10 }, { reps: 10 }] } }],
  notes: [],
  ...over,
})

describe('applyReadiness', () => {
  it('high readiness leaves loads ~unchanged and keeps all sets', () => {
    const out = applyReadiness(mk(), { sleepHours: 8, stress: 1, systemicFatigue: 1, regionStatus: {} })
    expect(out.readiness).toBe(1)
    expect(out.session.exercises[0].scheme.sets).toHaveLength(3)
    expect(out.session.exercises[0].scheme.sets[0].weight).toBe(160)
  })
  it('low readiness cuts load and trims sets', () => {
    const out = applyReadiness(mk(), { sleepHours: 4, stress: 5, systemicFatigue: 5, regionStatus: {} })
    expect(out.readiness).toBe(0)
    const sets = out.session.exercises[0].scheme.sets
    expect(sets.length).toBeLessThan(3)             // setsToDrop(0)=2 → 1 set
    expect(sets[0].weight).toBeLessThan(160)        // strength loadFactor 0.90
  })
  it('region status 3 drops the exercise with a note', () => {
    const out = applyReadiness(mk(), { sleepHours: 7, stress: 2, systemicFatigue: 2, regionStatus: { knee: 3 } })
    // Back Squat (High Bar) stresses knee → dropped
    expect(out.session.exercises.find((e) => e.baseLift === 'squat')).toBeFalsy()
    expect(out.notes.join(' ')).toMatch(/제외/)
  })
  it('accessory sets are trimmed but not weight-scaled (no weight field)', () => {
    const out = applyReadiness(mk(), { sleepHours: 4, stress: 5, systemicFatigue: 5, regionStatus: {} })
    const acc = out.session.accessories[0]
    expect(acc.scheme.sets.length).toBeLessThan(3)
    expect(acc.scheme.sets[0].weight).toBeUndefined()
  })
  it('low readiness reduces numeric rpe proportionally, floors at 6 (Fix 1)', () => {
    // readiness=0.75 (sleep=7,stress=2,fatigue=2): drop=0, all sets kept
    // strength sensitivity=1, RPE_K=2: reduction=round(0.25*1*2)=1; rpe 9→8
    const out = applyReadiness(mk(), { sleepHours: 7, stress: 2, systemicFatigue: 2, regionStatus: {} })
    const sets = out.session.exercises[0].scheme.sets
    expect(sets[0].rpe).toBe(8)
    expect(sets[0].rpe).toBeGreaterThanOrEqual(6)
  })
  it('rpe floor of 6 respected at very low readiness (Fix 1)', () => {
    // rpe=7, power quality (sensitivity=1.5), readiness=0: reduction=round(1*1.5*2)=3; 7-3=4→floor 6
    const session = mk({ exercises: [{ lift: 'Back Squat (High Bar)', baseLift: 'squat', quality: 'power',
      scheme: { type: 'straight', evidenceTier: 'consensus', sets: [{ weight: 100, reps: 3, rpe: 7 }] }, sets: 1 }] })
    const out = applyReadiness(session, { sleepHours: 4, stress: 5, systemicFatigue: 5, regionStatus: {} })
    expect(out.session.exercises[0].scheme.sets[0].rpe).toBe(6)
  })
  it('status-1 region pain caps weight at STATUS_SCALE[1]=0.85 (Fix 2)', () => {
    // readiness=1 → lf=1.0; knee=1 on Back Squat → effectiveLf=min(1.0,0.85)=0.85
    // 160*0.85=136 → roundToIncrement=135
    const out = applyReadiness(mk(), { sleepHours: 8, stress: 1, systemicFatigue: 1, regionStatus: { knee: 1 } })
    expect(out.session.exercises[0].scheme.sets[0].weight).toBe(135)
  })
  it('status-2 failed swap (inherent region) cuts load and trims extra set (Fix 2)', () => {
    // All squat variations stress knee → swap always fails for knee=2
    // effectiveLf=min(1.0,0.6)=0.6, extraDrop=1 → totalDrop=1 → 2 sets kept
    const out = applyReadiness(mk(), { sleepHours: 8, stress: 1, systemicFatigue: 1, regionStatus: { knee: 2 } })
    const exSets = out.session.exercises[0].scheme.sets
    expect(exSets.length).toBeLessThan(3)
    expect(Math.max(...exSets.map((s) => s.weight))).toBeLessThan(160)
  })
  it('restricted equipment prevents swap to gear-requiring exercises (Fix 3)', () => {
    // Paused Bench Press with pec=2: non-pec alternatives (Floor Press, Swiss Bar) need pins/swiss bar
    // With equipment=['barbell','rack','bench'] none pass → swap fails → Fix 2 cuts load to 0.6
    const benchSession = { day: 1, notes: [], accessories: [], exercises: [{
      lift: 'Paused Bench Press', baseLift: 'bench', quality: 'strength',
      scheme: { type: 'straight', evidenceTier: 'consensus', sets: [{ weight: 100, reps: 3, rpe: 9 }] }, sets: 1 }] }
    const restricted = applyReadiness(benchSession,
      { sleepHours: 8, stress: 1, systemicFatigue: 1, regionStatus: { pec: 2 } },
      { years: 1, equipment: ['barbell', 'rack', 'bench'] })
    expect(restricted.session.exercises[0].lift).toBe('Paused Bench Press')  // no swap
    expect(restricted.session.exercises[0].scheme.sets[0].weight).toBe(60)   // 100*0.6
  })
  it('overreaching flag applies extra 5% load cut and 1 set trim (Fix 4)', () => {
    // readiness=1, overreaching=true: lf=1.0→*0.95=0.95; totalDrop=0+0+1=1
    // trimSets([{160},{140},{140}],1): drops heaviest(160), keeps 2x140
    // weight=roundToIncrement(140*0.95=133)=132.5
    const out = applyReadiness(mk(), { sleepHours: 8, stress: 1, systemicFatigue: 1, regionStatus: {} }, {}, true)
    const sets = out.session.exercises[0].scheme.sets
    expect(sets.length).toBe(2)
    expect(sets[0].weight).toBeLessThan(140)
  })
  it('topSetBackoff low readiness drops heaviest (top) set, keeps backoff', () => {
    // mk() sets: [{weight:160},{weight:140},{weight:140}]. readiness=0 → drop=2 → keep 1.
    // Correct: drops top (160), keeps a backoff (140 → *0.9=126 → round2.5=125).
    // Broken old behavior: kept top (160→*0.9=144→145). This test distinguishes.
    const out = applyReadiness(mk(), { sleepHours: 4, stress: 5, systemicFatigue: 5, regionStatus: {} })
    const sets = out.session.exercises[0].scheme.sets
    expect(sets).toHaveLength(1)
    expect(sets[0].weight).toBe(125) // backoff weight (140*0.9→125), not top-set weight (160*0.9→145)
  })
})
