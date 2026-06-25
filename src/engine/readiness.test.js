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
})
