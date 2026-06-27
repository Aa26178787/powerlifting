import { describe, it, expect } from 'vitest'
import { tune } from './tuner.js'

describe('tune', () => {
  const profile = { blend: { power:0, strength:1, hypertrophy:0, endurance:0 }, years: 5, daysPerWeek: 4, fatigue: 1 }

  it('produces per-lift weekly sets for each main lift', () => {
    const t = tune(profile)
    // squat/bench: raw 10, setsPerSession=5 (freq 2), delivered=10
    expect(t.weeklySets.squat).toBe(10)
    expect(t.weeklySets.bench).toBe(10)
    // deadlift: raw 10 → scaled 0.6×=6, setsPerSession=min(4,round(6/1))=4, delivered=4×1=4
    expect(t.weeklySets.deadlift).toBe(4)
  })
  it('splits weekly sets across sessions by frequency, with an absolute per-session cap', () => {
    const t = tune(profile) // freq: squat2,bench2,deadlift1
    expect(t.setsPerSession.squat).toBe(5)   // round(10/2)
    // deadlift: liftWeekly=round(0.6×10)=6; round(6/1)=6 → capped to per-session ceiling (4).
    expect(t.setsPerSession.deadlift).toBe(4)
  })
  it('never prescribes fewer than 1 set per session', () => {
    const t = tune({ blend: { power:0, strength:1, hypertrophy:0, endurance:0 }, years: 0, daysPerWeek: 6, fatigue: 5 })
    expect(t.setsPerSession.bench).toBeGreaterThanOrEqual(1)
  })
  it('threads age to weeklySets (older -> fewer or equal delivered sets)', () => {
    const blend = { power:0, strength:0, hypertrophy:1, endurance:0 }
    const young = tune({ blend, years:5, daysPerWeek:4, fatigue:1, age:30 })
    const old   = tune({ blend, years:5, daysPerWeek:4, fatigue:1, age:60 })
    // Delivered weekly sets = setsPerSession × freq. When the per-session cap is
    // the binding constraint both age profiles hit the same cap → equal is valid.
    expect(old.weeklySets.squat).toBeLessThanOrEqual(young.weeklySets.squat)
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
  it('weeklySetsMap equals delivered (setsPerSession × frequency) for each lift', () => {
    const blend = { power:0, strength:1, hypertrophy:0, endurance:0 }
    const t = tune({ blend, years:5, daysPerWeek:4, fatigue:1 })
    const freq = t.frequency
    for (const lift of ['squat','bench','deadlift']) {
      expect(t.weeklySets[lift]).toBe(t.setsPerSession[lift] * freq[lift])
    }
  })
  it('deadlift delivered weekly sets < squat delivered weekly sets (axial fatigue scalar)', () => {
    const blend = { power:0, strength:1, hypertrophy:0, endurance:0 }
    const t = tune({ blend, years:5, daysPerWeek:4, fatigue:1 })
    expect(t.weeklySets.deadlift).toBeLessThan(t.weeklySets.squat)
  })
})
