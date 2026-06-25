import { describe, it, expect } from 'vitest'
import { toEngineProfile, buildPlan } from './planAdapter.js'

const form = {
  lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
  years: 3, daysPerWeek: 3, fatigue: 2,
  qualities: { power: 0, strength: 0.5, hypertrophy: 0.5, endurance: 0 },
  periodizationModel: 'auto',
  competition: { on: false, date: '' },
  style: { squat:{bar:'low'}, bench:{grip:'close'}, deadlift:{stance:'sumo'} },
  stickingPoint: { squat:'bottom', bench:'lockout', deadlift:'bottom' },
  regionStatus: { knee: 1 }, equipment: ['barbell','rack','bench'], sessionTimeLimit: null,
}

describe('toEngineProfile v3', () => {
  it('passes blend + model, drops goal', () => {
    const ep = toEngineProfile(form)
    expect(ep.qualities.strength).toBe(0.5)
    expect(ep.periodizationModel).toBe('auto')
    expect(ep).not.toHaveProperty('goal')
  })
})

describe('buildPlan v3', () => {
  it('4 weeks; exercises keep engine quality + reps range', () => {
    const plan = buildPlan(form)
    expect(plan.weeks).toHaveLength(4)
    const ex = plan.weeks[0].sessions[0].exercises[0]
    expect(ex).toHaveProperty('quality')
    expect(Array.isArray(ex.reps)).toBe(true)
  })

  it('carries priorityLift through to the engine (the bump itself is covered in generate.test.js)', () => {
    // Regression: the adapter previously dropped priorityLift, silently disabling
    // the wizard 우선 보강 feature even though generate.js reads it.
    expect(toEngineProfile({ ...form, priorityLift: 'bench' }).priorityLift).toBe('bench')
    expect(toEngineProfile(form).priorityLift).toBeUndefined()
  })
})
