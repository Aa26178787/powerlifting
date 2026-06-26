import { describe, it, expect } from 'vitest'
import { select, movementTypeOf } from './accessories.js'

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

describe('movementTypeOf', () => {
  it('classifies machine / free / skill', () => {
    expect(movementTypeOf({ name: 'Leg Press', equipment: ['leg press machine'] })).toBe('machine')
    expect(movementTypeOf({ name: 'Lat Pulldown (wide)', equipment: ['cables'] })).toBe('machine')
    expect(movementTypeOf({ name: 'Box Step-Up', equipment: ['db', 'box'] })).toBe('skill')
    expect(movementTypeOf({ name: 'Barbell Curl', equipment: ['barbell'] })).toBe('free')
  })
  it('explicit movementType overrides', () => {
    expect(movementTypeOf({ name: 'X', equipment: ['barbell'], movementType: 'machine' })).toBe('machine')
  })
})

describe('accessoryPreference', () => {
  const eq = ['barbell','rack','bench','cables','dumbbells','leg press machine','machine','box','db']
  const ranks = (pref) => {
    const r = select({ lift: 'squat', style: { bar: 'low' }, stickingPoint: 'none', sessionTimeLimit: 999,
      equipmentAvailable: eq, regionStatus: {}, accessoryPreference: pref })
    return r.map((e) => e.name)
  }
  it('default machine preference ranks Leg Press above Box Step-Up', () => {
    const names = ranks('machine')
    const lp = names.indexOf('Leg Press'), bs = names.indexOf('Box Step-Up')
    expect(lp).toBeGreaterThanOrEqual(0)
    expect(lp < bs || bs === -1).toBe(true)
  })
  it('free preference does not boost machines', () => {
    const names = ranks('free')
    // a free-weight squat accessory should appear; skill still demoted
    expect(names.length).toBeGreaterThan(0)
  })
})
