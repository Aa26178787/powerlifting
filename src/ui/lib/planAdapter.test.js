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

  it('passes per-lift frequency through', () => {
    const p = toEngineProfile({ ...form, frequency: { squat: 3, bench: 2, deadlift: 1 } })
    expect(p.frequency).toEqual({ squat: 3, bench: 2, deadlift: 1 })
  })
})

// ── liftLog feedback path ─────────────────────────────────────────────────────

describe('buildPlan liftLog feedback', () => {
  it('buildPlan(form, []) deep-equals buildPlan(form) — byte-identical regression lock', () => {
    const a = buildPlan(form)
    const b = buildPlan(form, [])
    expect(JSON.stringify(b)).toBe(JSON.stringify(a))
  })

  it('buildPlan(form) and buildPlan(form, [], {}) all return identical plans', () => {
    const a = buildPlan(form)
    const b = buildPlan(form, [], {})
    expect(JSON.stringify(b)).toBe(JSON.stringify(a))
  })

  it('buildPlan(form, squat-log×20) → squat main exercises differ, bench main exercises unchanged', () => {
    // 20 squat entries all way above seed (200) → effective squat e1rm hits CAP_UP (+15% → 230)
    const liftLog = Array.from({ length: 20 }, (_, i) => ({
      lift: 'squat', week: 1, day: i + 1,
      weight: 9999, reps: 1, rpe: 10, flag: null,
    }))
    const base = buildPlan(form)
    const fed  = buildPlan(form, liftLog)

    // Same number of weeks
    expect(fed.weeks).toHaveLength(base.weeks.length)

    // Bench main exercises unchanged (bench e1rm = 140 in both plans)
    const benchStr = (plan) => JSON.stringify(
      plan.weeks.map((w) => w.sessions.flatMap((s) => s.exercises.filter((e) => e.baseLift === 'bench'))),
    )
    expect(benchStr(fed)).toBe(benchStr(base))

    // Squat main exercises changed (effective e1rm 200 → 230, ≈+15% working weights)
    const squatStr = (plan) => JSON.stringify(
      plan.weeks.map((w) => w.sessions.flatMap((s) => s.exercises.filter((e) => e.baseLift === 'squat'))),
    )
    expect(squatStr(fed)).not.toBe(squatStr(base))
  })
})
