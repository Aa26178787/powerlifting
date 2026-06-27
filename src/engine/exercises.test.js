import { describe, it, expect } from 'vitest'
import { MAIN_LIFTS, all, byName, query, stressesRegion } from './exercises.js'

describe('exercises query', () => {
  it('MAIN_LIFTS', () => { expect(MAIN_LIFTS).toEqual(['squat','bench','deadlift']) })
  it('all() returns the library', () => { expect(all().length).toBeGreaterThanOrEqual(150) })
  it('byName finds the low-bar squat', () => {
    expect(byName('Back Squat (Low Bar)').category).toBe('competition')
  })
  it('query filters by category + targetLift', () => {
    const r = query({ category: 'variation', targetLift: 'deadlift' })
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((e) => e.category === 'variation' && e.targetLift === 'deadlift')).toBe(true)
  })
  it('equipmentAvailable excludes exercises needing missing gear (slash-OR semantics)', () => {
    const have = ['barbell', 'rack']
    const r = query({ targetLift: 'squat', equipmentAvailable: have })
    // Each equipment tag must be satisfiable: at least one slash-option is in the available set
    expect(r.every((e) => e.equipment.every((tag) => tag.split('/').some((opt) => have.includes(opt))))).toBe(true)
  })
  it('db/kb compound tag is accepted when db (but not kb) is available', () => {
    const r = query({ targetLift: 'squat', category: 'accessory', equipmentAvailable: ['db', 'box'] })
    expect(r.some((e) => e.name === 'Goblet Squat')).toBe(true)
  })
  it('db/kb compound tag is rejected when neither db nor kb is available', () => {
    const r = query({ targetLift: 'squat', category: 'accessory', equipmentAvailable: ['barbell', 'rack'] })
    expect(r.every((e) => e.name !== 'Goblet Squat')).toBe(true)
  })
  it('excludeAdvanced drops band/chain work', () => {
    const r = query({ excludeAdvanced: true })
    expect(r.every((e) => !e.advanced)).toBe(true)
  })
  it('stressesRegion checks the stress tag', () => {
    const dl = byName('Conventional Deadlift')
    expect(stressesRegion(dl, 'lowerBack')).toBe(true)
  })
})
