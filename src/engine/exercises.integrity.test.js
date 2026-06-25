import { describe, it, expect } from 'vitest'
import db from '../data/exercises.json' with { type: 'json' }

const CATEGORY = ['competition', 'variation', 'accessory']
const TARGET = ['squat', 'bench', 'deadlift', 'general']
const STICK = ['bottom', 'midrange', 'lockout', 'none']
const REGIONS = ['lowerBack','knee','shoulder','elbow','wrist','hip','hamstring','pec','bicepsTendon','ankle']

describe('exercise DB integrity', () => {
  it('has a large library', () => {
    expect(db.exercises.length).toBeGreaterThanOrEqual(150)
  })
  it('every exercise has valid required tags', () => {
    for (const ex of db.exercises) {
      expect(typeof ex.name).toBe('string')
      expect(CATEGORY).toContain(ex.category)
      expect(TARGET).toContain(ex.targetLift)
      expect(STICK).toContain(ex.stickingPoint)
      expect(typeof ex.primaryMuscle).toBe('string')
      expect(Array.isArray(ex.equipment)).toBe(true)
      expect(Array.isArray(ex.stress)).toBe(true)
      for (const r of ex.stress) expect(REGIONS).toContain(r)
    }
  })
  it('contains the four competition variants used by style.js', () => {
    const names = db.exercises.map((e) => e.name)
    expect(names).toContain('Back Squat (Low Bar)')
    expect(names).toContain('Back Squat (High Bar)')
    expect(names).toContain('Conventional Deadlift')
    expect(names).toContain('Sumo Deadlift')
    expect(names).toContain('Bench Press (Competition Grip)')
  })
  it('has variations and accessories for every main lift', () => {
    for (const lift of ['squat', 'bench', 'deadlift']) {
      expect(db.exercises.some((e) => e.category === 'variation' && e.targetLift === lift)).toBe(true)
      expect(db.exercises.some((e) => e.category === 'accessory')).toBe(true)
    }
  })
  it('names are unique', () => {
    const names = db.exercises.map((e) => e.name)
    expect(new Set(names).size).toBe(names.length)
  })
})
