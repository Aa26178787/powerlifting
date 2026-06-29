import { describe, it, expect } from 'vitest'
import { distinctDays, buildLayout } from './layoutGenerator.js'

describe('distinctDays', () => {
  it('returns f distinct days within 0..D-1', () => {
    const ds = distinctDays(3, 5, 0)
    expect(ds).toHaveLength(3)
    expect(new Set(ds).size).toBe(3)
    expect(ds.every((d) => d >= 0 && d < 5)).toBe(true)
  })
  it('phase shifts deterministically (centered, gap-maximizing placement)', () => {
    expect(distinctDays(2, 4, 0)).toEqual([1, 3])
    expect(distinctDays(2, 4, 1)).toEqual([2, 0])
  })
  it('avoids adjacent same-lift days when a gap exists (f=2, D=3 → [0,2] not [0,1])', () => {
    expect(distinctDays(2, 3, 0)).toEqual([0, 2])   // Mon, Wed — not Mon, Tue
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

describe('axial-fatigue stack guard', () => {
  // heavy squat and heavy deadlift must not share a day when alternative days exist.
  // With PHASE={squat:0,deadlift:2} and D>=3, heavies land on day 0 and day 2 — never the same.
  // Guard is a safety net; property must hold for any D that has room.
  function hasAxialConflict(layout) {
    return layout.some(
      (day) =>
        day.some((s) => s.lift === 'squat' && s.role === 'heavy') &&
        day.some((s) => s.lift === 'deadlift' && s.role === 'heavy')
    )
  }

  it('no day has both heavy squat and heavy deadlift — 4-day canvas', () => {
    const layout = buildLayout({
      daysPerWeek: 4,
      frequency: { squat: 2, bench: 0, deadlift: 2 },
    })
    expect(hasAxialConflict(layout)).toBe(false)
  })

  it('no day has both heavy squat and heavy deadlift — 5-day canvas', () => {
    const layout = buildLayout({
      daysPerWeek: 5,
      frequency: { squat: 2, bench: 0, deadlift: 2 },
    })
    expect(hasAxialConflict(layout)).toBe(false)
  })

  it('per-lift session counts unchanged after guard — 4-day canvas', () => {
    const layout = buildLayout({
      daysPerWeek: 4,
      frequency: { squat: 2, bench: 1, deadlift: 2 },
    })
    const slots = layout.flat()
    expect(slots.filter((s) => s.lift === 'squat')).toHaveLength(2)
    expect(slots.filter((s) => s.lift === 'bench')).toHaveLength(1)
    expect(slots.filter((s) => s.lift === 'deadlift')).toHaveLength(2)
  })

  it('guard allows unavoidable conflict on 2-day canvas (no alternative)', () => {
    // D=2, both heavies land on day 0 — guard cannot fix, must not throw or corrupt counts
    const layout = buildLayout({
      daysPerWeek: 2,
      frequency: { squat: 2, bench: 0, deadlift: 2 },
    })
    const slots = layout.flat()
    expect(slots.filter((s) => s.lift === 'squat')).toHaveLength(2)
    expect(slots.filter((s) => s.lift === 'deadlift')).toHaveLength(2)
  })
})
