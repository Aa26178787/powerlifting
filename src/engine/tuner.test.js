import { describe, it, expect } from 'vitest'
import { tune } from './tuner.js'

describe('tune', () => {
  const profile = { goal: 'strength', years: 5, daysPerWeek: 4, fatigue: 1 }

  it('produces per-lift weekly sets for each main lift', () => {
    const t = tune(profile)
    expect(t.weeklySets.squat).toBe(10) // strength MAV at 5 yrs, fatigue 1
    expect(t.weeklySets.bench).toBe(10)
    expect(t.weeklySets.deadlift).toBe(10)
  })
  it('splits weekly sets across sessions by frequency', () => {
    const t = tune(profile) // freq: squat2,bench2,deadlift1
    expect(t.setsPerSession.squat).toBe(5)   // round(10/2)
    expect(t.setsPerSession.deadlift).toBe(10) // round(10/1)
  })
  it('never prescribes fewer than 1 set per session', () => {
    const t = tune({ goal: 'strength', years: 0, daysPerWeek: 6, fatigue: 5 })
    expect(t.setsPerSession.bench).toBeGreaterThanOrEqual(1)
  })
})
