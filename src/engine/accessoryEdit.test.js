import { describe, it, expect } from 'vitest'
import { expandAccessory } from './setSchemes.js'
import { generate } from './generate.js'

describe('expandAccessory — sets/reps override (Feature 3)', () => {
  it('no override → unchanged (byte-identical straight)', () => {
    const a = expandAccessory('straight', { quality: 'hypertrophy', baseSets: 3 })
    const b = expandAccessory('straight', { quality: 'hypertrophy', baseSets: 3, override: null })
    expect(b).toEqual(a)
    expect(a.sets).toHaveLength(3)
    expect(a.sets.every((s) => s.reps === 10)).toBe(true)
  })
  it('override forces the user sets×reps, RPE ramps to the given target', () => {
    const { sets } = expandAccessory('myoReps', { quality: 'hypertrophy', override: { sets: 5, reps: 20, rpe: 9 } })
    expect(sets).toHaveLength(5)
    expect(sets.every((s) => s.reps === 20)).toBe(true)
    expect(sets[sets.length - 1].rpe).toBe(9)          // last set lands on target
    expect(sets[0].rpe).toBeLessThanOrEqual(9)          // ramps up
  })
  it('override rpe omitted → falls back to the quality default', () => {
    const { sets } = expandAccessory('straight', { quality: 'endurance', override: { sets: 2, reps: 25 } })
    expect(sets).toHaveLength(2)
    expect(sets.every((s) => s.reps === 25)).toBe(true)
    expect(sets[sets.length - 1].rpe).toBe(8)           // endurance default rpe
  })
})

describe('generate — accessory scheme override application', () => {
  const profile = {
    years: 1, daysPerWeek: 4, fatigue: 2, mesoWeeks: 4, deloadEnabled: true,
    lifts: { squat: { oneRM: 180 }, bench: { oneRM: 120 }, deadlift: { oneRM: 220 } },
  }
  const findAcc = (plan, name, deload) => {
    for (const wk of plan.weeks) {
      if (!!wk.isDeload !== !!deload) continue
      for (const s of wk.sessions) for (const a of s.accessories) if (a.name === name) return a
    }
    return null
  }
  it('a known auto-selected accessory adopts the user sets/reps in WORK weeks', () => {
    const baseline = generate(profile)
    const target = findAcc(baseline, 'Bulgarian Split Squat', false)
    expect(target).toBeTruthy()   // sanity: it is auto-selected
    const edited = generate({ ...profile, accessorySchemeOverrides: { 'Bulgarian Split Squat': { sets: 5, reps: 20, rpe: 8 } } })
    const a = findAcc(edited, 'Bulgarian Split Squat', false)
    expect(a.scheme.sets).toHaveLength(5)
    expect(a.scheme.sets.every((s) => s.reps === 20)).toBe(true)
    expect(a.scheme.type).toBe('straight')
  })
  it('the override is IGNORED on deload weeks (deload stays straight×~2)', () => {
    const edited = generate({ ...profile, accessorySchemeOverrides: { 'Bulgarian Split Squat': { sets: 8, reps: 30 } } })
    const d = findAcc(edited, 'Bulgarian Split Squat', true)
    if (d) {
      expect(d.scheme.sets.length).toBeLessThanOrEqual(3)   // not 8
      expect(d.scheme.sets.some((s) => s.reps === 30)).toBe(false)
    }
  })
  it('absent field → byte-identical to no-override plan', () => {
    const a = JSON.stringify(generate(profile))
    const b = JSON.stringify(generate({ ...profile, accessorySchemeOverrides: {} }))
    expect(b).toBe(a)
  })
})
