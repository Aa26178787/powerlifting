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
  it('"any" preference still demotes skill accessories (Box Step-Up ranks below Leg Press)', () => {
    const names = ranks('any')
    const lp = names.indexOf('Leg Press')
    const bs = names.indexOf('Box Step-Up')
    expect(lp).toBeGreaterThanOrEqual(0)
    expect(lp < bs || bs === -1).toBe(true)
  })
  it('free preference does not boost machines but still demotes skill', () => {
    const names = ranks('free')
    const lp = names.indexOf('Leg Press')
    const bs = names.indexOf('Box Step-Up')
    expect(names.length).toBeGreaterThan(0)
    // Box Step-Up (skill) must rank below Leg Press (machine) or be absent
    expect(bs === -1 || (lp !== -1 && lp < bs)).toBe(true)
  })
})

describe('muscle-group diversity guard (fix 1)', () => {
  it('no primaryMuscle string repeats in cap-3 result when alternatives exist', () => {
    const r = select({
      lift: 'squat', style: { bar: 'high' }, stickingPoint: 'none',
      sessionTimeLimit: null, // cap = 3 (default)
      equipmentAvailable: ['barbell','rack','bench','cables','dumbbells','leg press machine','machine'],
      regionStatus: {}, accessoryPreference: 'any',
    })
    expect(r).toHaveLength(3)
    const muscles = r.map((e) => e.primaryMuscle)
    expect(new Set(muscles).size).toBe(muscles.length) // all unique primaryMuscle strings
  })
})

describe('accessories score relevance priority (fix 4)', () => {
  it('bench:wide cap-3 result includes a triceps exercise before any biceps exercise', () => {
    // bench:wide emphasis = { chest: 1.3, triceps: 0.9 }
    // Diversity guard (fix 1) may defer later triceps exercises in favour of variety,
    // but the FIRST triceps representative (score 0.9) should still win a slot before
    // unmatched biceps exercises (score 0.5) at a realistic session cap.
    const r = select({
      lift: 'bench',
      style: { grip: 'wide' },
      stickingPoint: 'none',
      sessionTimeLimit: null, // cap = 3 (default)
      equipmentAvailable: ['barbell', 'rack', 'bench', 'cables', 'dumbbells'],
      regionStatus: {},
      accessoryPreference: 'any',
      excluded: [],
    })
    const tricepsIdx = r.findIndex((e) => e.primaryMuscle.includes('triceps'))
    const bicepsIdx  = r.findIndex((e) => e.primaryMuscle === 'biceps')
    expect(tricepsIdx).toBeGreaterThanOrEqual(0)                        // at least one triceps exercise
    expect(bicepsIdx === -1 || tricepsIdx < bicepsIdx).toBe(true)       // triceps before biceps (if biceps present)
  })
})
