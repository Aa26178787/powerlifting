import { describe, it, expect } from 'vitest'
import { resolveE1rm, generate } from './generate.js'
import { byName } from './exercises.js'

const profile = {
  lifts: {
    squat: { oneRM: 200 },
    bench: { weight: 113, reps: 5, rpe: 8 }, // ~139 e1RM
    deadlift: { oneRM: 240 },
  },
  years: 3, daysPerWeek: 3, goal: 'balanced', fatigue: 2,
}

describe('resolveE1rm', () => {
  it('uses a direct 1RM when provided', () => {
    expect(resolveE1rm({ oneRM: 200 })).toBe(200)
  })
  it('estimates from weight x reps @ RPE otherwise', () => {
    expect(resolveE1rm({ weight: 325, reps: 5, rpe: 8 })).toBeCloseTo(400.74, 1)
  })
})

describe('generate', () => {
  it('produces a 4-week mesocycle ending in a deload', () => {
    const plan = generate(profile)
    expect(plan.template).toBe('dup')
    expect(plan.weeks).toHaveLength(4)
    expect(plan.weeks[3].isDeload).toBe(true)
    expect(plan.weeks[0].isDeload).toBe(false)
  })
  it('every working set has a concrete weight, reps, RPE target', () => {
    const plan = generate(profile)
    const ex = plan.weeks[0].sessions[0].exercises[0]
    expect(ex.weight).toBeGreaterThan(0)
    expect(ex.reps).toBeGreaterThan(0)
    expect(ex.rpeTarget).toBeGreaterThanOrEqual(6)
    expect(ex.rpeTarget).toBeLessThanOrEqual(9.5)
  })
})

// Profile for style/accessories tests (no region restrictions)
const styleProfile = {
  lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
  years: 3, daysPerWeek: 4, goal: 'strength', fatigue: 2,
  style: { squat: { bar: 'low' }, bench: { grip: 'close' }, deadlift: { stance: 'sumo' } },
  stickingPoint: { squat: 'bottom', bench: 'lockout', deadlift: 'bottom' },
  equipment: ['barbell','rack','bench','box','pins','deficit','blocks','cables','dumbbells'],
}

// Profile for region-status tests
const richProfile = {
  lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
  years: 3, daysPerWeek: 4, goal: 'strength', fatigue: 2,
  style: { squat: { bar: 'low' }, bench: { grip: 'close' }, deadlift: { stance: 'sumo' } },
  stickingPoint: { squat: 'bottom', bench: 'lockout', deadlift: 'bottom' },
  regionStatus: { lowerBack: 3 },
  equipment: ['barbell','rack','bench','box','pins','deficit','blocks','cables','dumbbells'],
}

describe('generate v2', () => {
  it('uses the styled competition deadlift variant on heavy slots', () => {
    const plan = generate(styleProfile)
    const names = plan.weeks[0].sessions.flatMap((s) => s.exercises).map((e) => e.lift)
    expect(names).toContain('Sumo Deadlift')
  })
  it('attaches accessories to every session', () => {
    const plan = generate(styleProfile)
    expect(plan.weeks[0].sessions.every((s) => Array.isArray(s.accessories))).toBe(true)
    expect(plan.weeks[0].sessions.some((s) => s.accessories.length > 0)).toBe(true)
  })
  it('region status 3 (lowerBack) keeps no lowerBack-stressing main work in week 1', () => {
    const plan = generate(richProfile)
    const mains = plan.weeks[0].sessions.flatMap((s) => s.exercises)
    const offenders = mains.filter((e) => {
      const ex = byName(e.lift)
      return ex && ex.stress.includes('lowerBack')
    })
    expect(offenders.length).toBe(0)
  })
  it('surfaces dropped deadlift in session notes when lowerBack is status 3', () => {
    const plan = generate(richProfile)
    const allNotes = plan.weeks[0].sessions.flatMap((s) => s.notes)
    const deadliftNote = allNotes.find((n) => n.includes('deadlift'))
    expect(deadliftNote).toBeTruthy()
  })
})
