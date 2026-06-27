import { describe, it, expect } from 'vitest'
import { readinessScore, loadFactor, setsToDrop } from './readiness.js'
describe('readiness scores', () => {
  it('full readiness for great sleep/low stress/low fatigue', () => {
    expect(readinessScore({ sleepHours: 8, stress: 1, systemicFatigue: 1 })).toBe(1)
  })
  it('low readiness for poor inputs', () => {
    expect(readinessScore({ sleepHours: 4, stress: 5, systemicFatigue: 5 })).toBe(0)
  })
  it('mid readiness is between', () => {
    const r = readinessScore({ sleepHours: 6, stress: 3, systemicFatigue: 3 })
    expect(r).toBeGreaterThan(0); expect(r).toBeLessThan(1)
  })
  it('loadFactor: power most sensitive, 1.0 at full readiness', () => {
    expect(loadFactor(1, 'power')).toBe(1)
    expect(loadFactor(0, 'power')).toBeLessThan(loadFactor(0, 'strength'))
    expect(loadFactor(0, 'strength')).toBeLessThan(loadFactor(0, 'endurance'))
  })
  it('setsToDrop steps with readiness', () => {
    expect(setsToDrop(0.8)).toBe(0); expect(setsToDrop(0.4)).toBe(1); expect(setsToDrop(0.2)).toBe(2)
  })
  it('partial checkin (only sleepHours) returns finite readiness in [0,1]', () => {
    // Missing stress/systemicFatigue → old code: NaN. Fixed: fall back to neutral 0.5.
    const r = readinessScore({ sleepHours: 7 })
    expect(Number.isFinite(r)).toBe(true)
    expect(r).toBeGreaterThanOrEqual(0)
    expect(r).toBeLessThanOrEqual(1)
  })
  it('undefined checkin fields do not poison weight calculations', () => {
    // All undefined → readinessScore should return 0.5 (all mid), not NaN
    expect(readinessScore({})).toBe(0.5)
  })
})
