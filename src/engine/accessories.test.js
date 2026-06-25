import { describe, it, expect } from 'vitest'
import { select } from './accessories.js'

describe('accessories.select', () => {
  const base = { equipmentAvailable: ['barbell','rack','bench','cables','dumbbells'], regionStatus: {} }

  it('close-grip bench biases triceps accessories to the top', () => {
    const r = select({ lift: 'bench', style: { grip: 'close' }, stickingPoint: 'lockout', sessionTimeLimit: null, ...base })
    expect(r.length).toBeGreaterThan(0)
    expect(r.some((e) => e.primaryMuscle === 'triceps')).toBe(true)
  })
  it('high-bar squat (quad emphasis) surfaces quad accessories', () => {
    const r = select({ lift: 'squat', style: { bar: 'high' }, stickingPoint: 'none', sessionTimeLimit: null,
      equipmentAvailable: ['barbell','rack','bench','cables','dumbbells','leg press machine','machine'], regionStatus: {} })
    expect(r.length).toBeGreaterThan(0)
    expect(r.some((e) => e.primaryMuscle.includes('quads'))).toBe(true)
  })
  it('caps count by session time', () => {
    const r = select({ lift: 'squat', style: { bar: 'low' }, stickingPoint: 'none', sessionTimeLimit: 30, ...base })
    expect(r.length).toBeLessThanOrEqual(2) // floor(30/15)=2
  })
  it('drops accessories whose region is avoid (status 3)', () => {
    const r = select({ lift: 'deadlift', style: { stance: 'conventional' }, stickingPoint: 'none', sessionTimeLimit: null,
      equipmentAvailable: base.equipmentAvailable, regionStatus: { lowerBack: 3 } })
    expect(r.every((e) => !e.stress.includes('lowerBack'))).toBe(true)
  })
})
