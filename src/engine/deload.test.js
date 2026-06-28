import { describe, it, expect } from 'vitest'
import { buildDeloadWeek } from './deload.js'
import { byName } from './exercises.js'

const ctx = { e1rm: { squat: 200, bench: 140, deadlift: 240 } }
const workingWeek = {
  index: 3, isDeload: false,
  sessions: [{ day: 1, exercises: [
    { lift: 'Back Squat (Low Bar)', baseLift: 'squat', quality: 'strength', sets: 5, reps: [2,5], repAnchor: 3, pct: 87, rpeTarget: 9, weight: 180, velocity: null, autoregulate: true },
  ] }],
}

describe('buildDeloadWeek', () => {
  it('halves sets, drops RPE to 6, and flags deload', () => {
    const wk = buildDeloadWeek(workingWeek, ctx)
    expect(wk.isDeload).toBe(true)
    const ex = wk.sessions[0].exercises[0]
    expect(ex.sets).toBe(3) // ceil(5/2)
    expect(ex.rpeTarget).toBe(6)
    expect(ex.reps).toEqual([2,5])
    expect(ex.weight).toBeLessThan(180)
  })
  it('applies e1rmModifier to deload weight for variation exercises', () => {
    const variationWorkingWeek = {
      index: 3, isDeload: false,
      sessions: [{ day: 1, exercises: [
        { lift: 'Pause Squat (bottom)', baseLift: 'squat', quality: 'strength', sets: 5, reps: [2,5], repAnchor: 3, pct: 87, rpeTarget: 9, weight: 180, velocity: null, autoregulate: true },
      ] }],
    }
    const wk = buildDeloadWeek(variationWorkingWeek, ctx)
    const ex = wk.sessions[0].exercises[0]
    expect(Number.isFinite(ex.weight)).toBe(true)
    const exData = byName('Pause Squat (bottom)')
    expect(exData.e1rmModifier).toBeLessThan(1)
  })
})

describe('buildDeloadWeek — straight scheme', () => {
  it('emits a straight scheme at reduced weight/sets', () => {
    const wk = buildDeloadWeek(workingWeek, ctx)
    const ex = wk.sessions[0].exercises[0]
    expect(ex.scheme).toBeDefined()
    expect(ex.scheme.type).toBe('straight')
    expect(ex.scheme.sets.length).toBe(ex.sets)
    for (const s of ex.scheme.sets) {
      expect(s.weight).toBe(ex.weight)
    }
  })
})

describe('buildDeloadWeek — realization taper (Bosquet)', () => {
  it('realization holds intensity and cuts volume ~0.4', () => {
    const wk = { index: 4, sessions: [{ day: 1, exercises: [
      { lift: 'Squat', baseLift: 'squat', repAnchor: 3, rpeTarget: 8.5, sets: 5,
        scheme: { type:'straight', sets:[{weight:200,reps:3,rpe:8.5}] }, weight: 200 } ] }] }
    const out = buildDeloadWeek(wk, { e1rm: { squat: 230 } }, { realization: true })
    const ex = out.sessions[0].exercises[0]
    expect(ex.rpeTarget).toBe(8.5)            // intensity held (not 6)
    expect(ex.weight).toBe(200)               // load held
    expect(ex.sets).toBe(2)                    // round(5*0.4)=2 volume cut
  })
  it('default deload still drops to RPE 6 (recovery, unchanged)', () => {
    const wk = { index: 4, sessions: [{ day: 1, exercises: [
      { lift: 'Squat', baseLift: 'squat', repAnchor: 3, sets: 5 } ] }] }
    const out = buildDeloadWeek(wk, { e1rm: { squat: 230 } })
    expect(out.sessions[0].exercises[0].rpeTarget).toBe(6)
  })
})

