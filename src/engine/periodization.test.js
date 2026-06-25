import { describe, it, expect } from 'vitest'
import { buildWorkingWeeks } from './periodization.js'
import { byName } from './exercises.js'

const ctx = {
  e1rm: { squat: 200, bench: 140, deadlift: 240 },
  setsPerSession: { squat: 4, bench: 4, deadlift: 4 },
  style: { squat: { bar: 'low' }, bench: { grip: 'medium' }, deadlift: { stance: 'conventional' } },
  stickingPoint: { squat: 'none', bench: 'none', deadlift: 'none' },
  equipment: ['barbell','rack','bench','box','pins','deficit','blocks'],
  advanced: false,
  regionStatus: {},
  model: 'undulating',
  blend: { power: 0, strength: 0.5, hypertrophy: 0.5, endurance: 0 },
  competition: { on: false, date: '' },
}

describe('buildWorkingWeeks v3', () => {
  it('builds 3 weeks and tags every exercise with a quality + rep range', () => {
    const weeks = buildWorkingWeeks('dup', 3, ctx)
    expect(weeks).toHaveLength(3)
    const exs = weeks.flatMap((w) => w.sessions).flatMap((s) => s.exercises)
    expect(exs.length).toBeGreaterThan(0)
    for (const e of exs) {
      expect(['power','strength','hypertrophy','endurance']).toContain(e.quality)
      expect(Array.isArray(e.reps)).toBe(true)
      expect(e.reps).toHaveLength(2)
      expect(e.autoregulate).toBe(true)
      expect(Number.isFinite(e.weight)).toBe(true)
    }
  })
  it('a strength slot uses the strength rep range [2,5]', () => {
    const weeks = buildWorkingWeeks('dup', 3, ctx)
    const strengthEx = weeks[0].sessions.flatMap((s) => s.exercises).find((e) => e.quality === 'strength')
    expect(strengthEx.reps).toEqual([2, 5])
  })
  it('block model concentrates a single quality in week 1', () => {
    const weeks = buildWorkingWeeks('dup', 3, { ...ctx, model: 'block' })
    const qualities = new Set(weeks[0].sessions.flatMap((s) => s.exercises).map((e) => e.quality))
    expect(qualities.size).toBe(1)
  })
}
)
