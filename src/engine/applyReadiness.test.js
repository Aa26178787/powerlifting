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
})
