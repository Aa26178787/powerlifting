import { describe, it, expect } from 'vitest'
import { tune } from './tuner.js'

describe('tune', () => {
  const profile = { blend: { power:0, strength:1, hypertrophy:0, endurance:0 }, years: 5, daysPerWeek: 4, fatigue: 1 }

  it('produces per-lift weekly sets for each main lift', () => {
    const t = tune(profile)
    expect(t.weeklySets.squat).toBe(10) // strength MAV at 5 yrs, fatigue 1
    expect(t.weeklySets.bench).toBe(10)
    expect(t.weeklySets.deadlift).toBe(10)
  })
  it('splits weekly sets across sessions by frequency, with an absolute per-session cap', () => {
    const t = tune(profile) // freq: squat2,bench2,deadlift1
    expect(t.setsPerSession.squat).toBe(5)   // round(10/2)
    // round(10/1)=10 would stack the whole week into one session — capped to the
    // deadlift per-session ceiling (4, highest axial/CNS fatigue).
    expect(t.setsPerSession.deadlift).toBe(4)
  })
  it('never prescribes fewer than 1 set per session', () => {
    const t = tune({ blend: { power:0, strength:1, hypertrophy:0, endurance:0 }, years: 0, daysPerWeek: 6, fatigue: 5 })
    expect(t.setsPerSession.bench).toBeGreaterThanOrEqual(1)
  })
  it('threads age to weeklySets (older -> fewer or equal sets)', () => {
    const blend = { power:0, strength:0, hypertrophy:1, endurance:0 }
    const young = tune({ blend, years:5, daysPerWeek:4, fatigue:1, age:30 })
    const old   = tune({ blend, years:5, daysPerWeek:4, fatigue:1, age:60 })
    expect(old.weeklySets.squat).toBeLessThanOrEqual(young.weeklySets.squat)
    expect(old.weeklySets.squat).toBeLessThan(young.weeklySets.squat)
  })
  it('uses explicit frequency for setsPerSession', () => {
    const blend = { power: 0, strength: 1, hypertrophy: 0, endurance: 0 }
    const t = tune({ blend, years: 5, daysPerWeek: 4, fatigue: 1, frequency: { squat: 4, bench: 2, deadlift: 1 } })
    expect(t.setsPerSession.squat).toBe(Math.max(1, Math.round(t.weeklySets.squat / 4)))
    expect(t.setsPerSession.bench).toBe(Math.max(1, Math.round(t.weeklySets.bench / 2)))
  })
  it('frequency 0 yields 0 sets (no division by zero)', () => {
    const blend = { power: 0, strength: 1, hypertrophy: 0, endurance: 0 }
    const t = tune({ blend, years: 5, daysPerWeek: 4, fatigue: 1, frequency: { squat: 2, bench: 2, deadlift: 0 } })
    expect(t.setsPerSession.deadlift).toBe(0)
  })
  it('falls back to defaultFrequency when none given', () => {
    const blend = { power: 0, strength: 1, hypertrophy: 0, endurance: 0 }
    const t = tune({ blend, years: 5, daysPerWeek: 4, fatigue: 1 })
    expect(t.frequency).toEqual({ squat: 2, bench: 2, deadlift: 1 })
  })
})
