import { describe, it, expect } from 'vitest'
import { toEngineProfile, enrichExercise, accessoriesForSession, buildPlan } from './planAdapter.js'

const form = {
  lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
  years: 3, daysPerWeek: 3, goal: 'balanced', fatigue: 2,
  competition: { on: false, date: '' }, age: 30, bodyweight: 90, sex: 'M',
  weakLift: 'bench', injuries: [], sessionTimeLimit: null, equipment: ['barbell', 'rack', 'bench'],
}

describe('toEngineProfile', () => {
  it('keeps only engine fields', () => {
    const ep = toEngineProfile(form)
    expect(Object.keys(ep).sort()).toEqual(['daysPerWeek', 'fatigue', 'goal', 'injuries', 'lifts', 'years'])
    expect(ep.lifts.squat).toEqual({ oneRM: 200 })
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

describe('accessoriesForSession', () => {
  it('returns equipment-filtered accessories for the session main lifts', () => {
    const session = { day: 1, exercises: [{ lift: 'bench' }] }
    const acc = accessoriesForSession(session, ['barbell', 'bench', 'dumbbells'], [], null)
    expect(acc).toContain('dumbbell bench')
  })
  it('caps the count when a session time limit is set', () => {
    const session = { day: 1, exercises: [{ lift: 'squat' }, { lift: 'bench' }] }
    const acc = accessoriesForSession(session, ['barbell', 'rack', 'bench', 'dumbbells', 'leg press machine'], [], 20)
    expect(acc.length).toBeLessThanOrEqual(1) // floor(20/20)=1
  })
})

describe('buildPlan', () => {
  it('produces an enriched 4-week plan with pct filled on every exercise', () => {
    const plan = buildPlan(form)
    expect(plan.weeks).toHaveLength(4)
    const allEx = plan.weeks.flatMap((w) => w.sessions).flatMap((s) => s.exercises)
    expect(allEx.every((e) => e.pct === null || typeof e.pct === 'number')).toBe(true)
    expect(allEx.some((e) => typeof e.pct === 'number')).toBe(true)
    expect(plan.weeks[0].sessions[0]).toHaveProperty('accessories')
  })
})
