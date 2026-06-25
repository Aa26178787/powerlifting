import { describe, it, expect } from 'vitest'
import { buildDeloadWeek, needsDeload } from './deload.js'
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

describe('needsDeload', () => {
  it('always deloads at week 4', () => {
    expect(needsDeload(4, 1)).toBe(true)
  })
  it('deloads early (week 3) under maximal fatigue', () => {
    expect(needsDeload(3, 5)).toBe(true)
    expect(needsDeload(3, 2)).toBe(false)
  })
})
