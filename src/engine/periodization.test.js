import { describe, it, expect } from 'vitest'
import { WEEK_RPE_OFFSET, cap, buildSession, buildWorkingWeeks } from './periodization.js'

const ctx = {
  e1rm: { squat: 200, bench: 140, deadlift: 240 },
  setsPerSession: { squat: 5, bench: 4, deadlift: 5 },
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
    const session = buildSession(slots, 1, ctx) // week index 1 -> offset 0.5
    const ex = session.exercises[0]
    expect(ex.lift).toBe('squat')
    expect(ex.reps).toBe(3)
    expect(ex.rpeTarget).toBe(8.5)
    expect(ex.sets).toBe(5)
    expect(ex.velocity).toBeNull()
    expect(ex.weight).toBeGreaterThan(0)
  })
})

describe('buildWorkingWeeks', () => {
  it('produces three working weeks for a 3-day DUP layout', () => {
    const weeks = buildWorkingWeeks('dup', 3, ctx)
    expect(weeks).toHaveLength(3)
    expect(weeks[0].sessions).toHaveLength(3)
    expect(weeks[0].isDeload).toBe(false)
  })
})
