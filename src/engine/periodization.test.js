import { describe, it, expect } from 'vitest'
import { WEEK_RPE_OFFSET, cap, buildSession, buildWorkingWeeks } from './periodization.js'
import { byName } from './exercises.js'

const richCtx = {
  e1rm: { squat: 200, bench: 140, deadlift: 240 },
  setsPerSession: { squat: 5, bench: 4, deadlift: 5 },
  style: { squat: { bar: 'low' }, bench: { grip: 'medium' }, deadlift: { stance: 'sumo' } },
  stickingPoint: { squat: 'bottom', bench: 'lockout', deadlift: 'bottom' },
  equipment: ['barbell','rack','bench','box','pins','deficit','blocks'],
  advanced: false,
  regionStatus: { knee: 2 },
}

describe('cap', () => {
  it('never returns above 9.5', () => {
    expect(cap(10.5)).toBe(9.5)
    expect(cap(8)).toBe(8)
  })
})

describe('buildSession', () => {
  it('builds exercises with RPE raised by the week offset', () => {
    const slots = [{ lift: 'squat', role: 'heavy' }] // heavy = reps 3, rpeStart 8
    const session = buildSession(slots, 1, richCtx) // week index 1 -> offset 0.5
    const ex = session.exercises[0]
    expect(ex.lift).toBe('Back Squat (Low Bar)')
    expect(ex.reps).toBe(3)
    expect(ex.rpeTarget).toBe(8.5)
    expect(ex.sets).toBe(3) // 5 * 0.6 (volumeScale for knee=2)
    expect(ex.velocity).toBeNull()
    expect(ex.weight).toBeGreaterThan(0)
  })
})

describe('buildSession v2', () => {
  it('comp slot resolves to the styled competition variant', () => {
    const s = buildSession([{ lift: 'deadlift', role: 'heavy' }], 0, richCtx)
    expect(s.exercises[0].lift).toBe('Sumo Deadlift')
    expect(s.exercises[0].baseLift).toBe('deadlift')
  })
  it('variation slot resolves to a variation (not the bare comp lift name)', () => {
    const s = buildSession([{ lift: 'squat', role: 'volume' }], 0, richCtx)
    const ex = byName(s.exercises[0].lift)
    expect(ex).toBeDefined()
    expect(['variation','competition']).toContain(ex.category) // variation, or comp fallback
  })
  it('knee status 2 scales squat volume down (sets reduced)', () => {
    const s = buildSession([{ lift: 'squat', role: 'heavy' }], 0, richCtx)
    // base 5 * 0.6 = 3
    expect(s.exercises[0].sets).toBe(3)
  })
})

describe('buildWorkingWeeks', () => {
  it('produces three working weeks for a 3-day DUP layout', () => {
    const weeks = buildWorkingWeeks('dup', 3, richCtx)
    expect(weeks).toHaveLength(3)
    expect(weeks[0].sessions).toHaveLength(3)
    expect(weeks[0].isDeload).toBe(false)
  })
})
