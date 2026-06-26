import { describe, it, expect } from 'vitest'
import { distinctDays, buildLayout } from './layoutGenerator.js'

describe('distinctDays', () => {
  it('returns f distinct days within 0..D-1', () => {
    const ds = distinctDays(3, 5, 0)
    expect(ds).toHaveLength(3)
    expect(new Set(ds).size).toBe(3)
    expect(ds.every((d) => d >= 0 && d < 5)).toBe(true)
  })
  it('phase shifts deterministically', () => {
    expect(distinctDays(2, 4, 0)).toEqual([0, 2])
    expect(distinctDays(2, 4, 1)).toEqual([1, 3])
  })
})

describe('buildLayout', () => {
  const freq = { squat: 3, bench: 1, deadlift: 0 }
  it('emits one slot per lift-session, none for freq 0', () => {
    const layout = buildLayout({ daysPerWeek: 5, frequency: freq })
    const slots = layout.flat()
    expect(slots.filter((s) => s.lift === 'squat')).toHaveLength(3)
    expect(slots.filter((s) => s.lift === 'bench')).toHaveLength(1)
    expect(slots.filter((s) => s.lift === 'deadlift')).toHaveLength(0)
  })
  it('a lift appears at most once per day', () => {
    const layout = buildLayout({ daysPerWeek: 5, frequency: freq })
    for (const day of layout) {
      const lifts = day.map((s) => s.lift)
      expect(new Set(lifts).size).toBe(lifts.length)
    }
  })
  it('each lift has exactly one heavy (comp) slot', () => {
    const layout = buildLayout({ daysPerWeek: 5, frequency: freq })
    const squatHeavy = layout.flat().filter((s) => s.lift === 'squat' && s.role === 'heavy')
    expect(squatHeavy).toHaveLength(1)
  })
  it('all-zero frequency yields an empty layout', () => {
    expect(buildLayout({ daysPerWeek: 4, frequency: { squat: 0, bench: 0, deadlift: 0 } })).toEqual([])
  })
})
