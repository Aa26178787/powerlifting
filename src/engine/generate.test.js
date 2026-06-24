import { describe, it, expect } from 'vitest'
import { resolveE1rm, generate } from './generate.js'

const profile = {
  lifts: {
    squat: { oneRM: 200 },
    bench: { weight: 113, reps: 5, rpe: 8 }, // ~139 e1RM
    deadlift: { oneRM: 240 },
  },
  years: 3, daysPerWeek: 3, goal: 'balanced', fatigue: 2,
}

describe('resolveE1rm', () => {
  it('uses a direct 1RM when provided', () => {
    expect(resolveE1rm({ oneRM: 200 })).toBe(200)
  })
  it('estimates from weight x reps @ RPE otherwise', () => {
    expect(resolveE1rm({ weight: 325, reps: 5, rpe: 8 })).toBeCloseTo(400.74, 1)
  })
})

describe('generate', () => {
  it('produces a 4-week mesocycle ending in a deload', () => {
    const plan = generate(profile)
    expect(plan.template).toBe('dup')
    expect(plan.weeks).toHaveLength(4)
    expect(plan.weeks[3].isDeload).toBe(true)
    expect(plan.weeks[0].isDeload).toBe(false)
  })
  it('every working set has a concrete weight, reps, RPE target', () => {
    const plan = generate(profile)
    const ex = plan.weeks[0].sessions[0].exercises[0]
    expect(ex.weight).toBeGreaterThan(0)
    expect(ex.reps).toBeGreaterThan(0)
    expect(ex.rpeTarget).toBeGreaterThanOrEqual(6)
    expect(ex.rpeTarget).toBeLessThanOrEqual(9.5)
  })
  it('applies injury substitutions to lift names', () => {
    const injured = generate({ ...profile, injuries: ['knee'] })
    const squatExercises = injured.weeks[0].sessions
      .flatMap((s) => s.exercises)
      .filter((e) => e.lift === 'box squat')
    expect(squatExercises.length).toBeGreaterThan(0)
  })
})
