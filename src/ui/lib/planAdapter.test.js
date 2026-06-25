import { describe, it, expect } from 'vitest'
import { toEngineProfile, enrichExercise, buildPlan } from './planAdapter.js'

const form = {
  lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
  years: 3, daysPerWeek: 3, goal: 'balanced', fatigue: 2,
  style: { squat:{bar:'low'}, bench:{grip:'close'}, deadlift:{stance:'sumo'} },
  stickingPoint: { squat:'bottom', bench:'lockout', deadlift:'bottom' },
  regionStatus: { knee: 1 }, equipment: ['barbell','rack','bench'], sessionTimeLimit: null,
}

describe('toEngineProfile', () => {
  it('passes the v2 fields and drops UI-only ones', () => {
    const ep = toEngineProfile(form)
    expect(Object.keys(ep).sort()).toEqual(['daysPerWeek','equipment','fatigue','goal','lifts','regionStatus','sessionTimeLimit','stickingPoint','style','years'])
    expect(ep.style.deadlift.stance).toBe('sumo')
  })
})

describe('enrichExercise', () => {
  it('fills pct from reps and rpeTarget', () => {
    const ex = { lift: 'squat', sets: 5, reps: 5, pct: undefined, rpeTarget: 8, weight: 162.5, velocity: null }
    expect(enrichExercise(ex).pct).toBe(81.1) // pctOf1RM(5,8)
  })
  it('returns null pct for out-of-range reps', () => {
    const ex = { lift: 'squat', sets: 1, reps: 15, pct: undefined, rpeTarget: 8, weight: 100, velocity: null }
    expect(enrichExercise(ex).pct).toBeNull()
  })
})

describe('buildPlan v2', () => {
  it('produces 4 weeks with engine accessories and pct-filled exercises', () => {
    const plan = buildPlan(form)
    expect(plan.weeks).toHaveLength(4)
    const allEx = plan.weeks.flatMap((w) => w.sessions).flatMap((s) => s.exercises)
    expect(allEx.every((e) => e.pct === null || typeof e.pct === 'number')).toBe(true)
    expect(plan.weeks[0].sessions[0]).toHaveProperty('accessories')
  })
})
