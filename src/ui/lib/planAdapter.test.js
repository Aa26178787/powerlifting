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
  it('default mesocycle = 4 working + 1 deload = 5 weeks; exercises keep engine quality + reps range', () => {
    const plan = buildPlan(form)
    expect(plan.weeks).toHaveLength(5)
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

  it('carries mesoWeeks to engine profile', () => {
    const ep = toEngineProfile({ ...form, mesoWeeks: 6 })
    expect(ep.mesoWeeks).toBe(6)
  })

  it('carries excludedExercises and keeps full equipment', () => {
    const ep = toEngineProfile({ ...form, excludedExercises: ['Tempo Squat'] })
    expect(ep.excludedExercises).toContain('Tempo Squat')
    expect(ep.equipment).toContain('barbell')
  })

  it('carries variationOverride through to engine profile', () => {
    const overrides = { 'squat/barbell': 'squat/ssb' }
    const ep = toEngineProfile({ ...form, variationOverride: overrides })
    expect(ep.variationOverride).toEqual(overrides)
  })

  it('variationOverride defaults to empty object when not provided', () => {
    const ep = toEngineProfile(form)
    expect(ep.variationOverride).toEqual({})
  })

  it('deloadEnabled is carried to engine profile', () => {
    const ep = toEngineProfile({ ...form, deloadEnabled: true })
    expect(ep.deloadEnabled).toBe(true)
    const ep2 = toEngineProfile({ ...form, deloadEnabled: false })
    expect(ep2.deloadEnabled).toBe(false)
  })

  it('passes user equipment through (not allEquipment)', () => {
    expect(toEngineProfile(form).equipment).toEqual(['barbell','rack','bench'])
  })

  it('passes age through', () => {
    expect(toEngineProfile({ ...form, age: 45 }).age).toBe(45)
  })

  it('passes accessoryPreference through (default machine when set)', () => {
    expect(toEngineProfile({ ...form, accessoryPreference: 'free' }).accessoryPreference).toBe('free')
  })
})
