import { describe, it, expect } from 'vitest'
import { streetSystemE1rm, addedFromSystem, expandStreetLift, buildStreetWeek, STREET_LIFTS, STREET_MICRO_INC } from './streetLifting.js'
import { e1rmFrom } from './e1rm.js'
import { MAIN_LIFTS } from './exercises.js'
import { generate } from './generate.js'

describe('street math', () => {
  it('streetSystemE1rm = e1rmFrom(k·BW + added, reps, rpe)', () => {
    expect(streetSystemE1rm(0.95, 80, 40, 1, 10)).toBe(e1rmFrom(0.95 * 80 + 40, 1, 10))
  })
  it('addedFromSystem inverts the system load to belt load (1.25 increments)', () => {
    expect(addedFromSystem(116, 0.95, 80)).toBe(Math.round((116 - 76) / STREET_MICRO_INC) * STREET_MICRO_INC)
  })
})

describe('expandStreetLift', () => {
  const sysE1rm = streetSystemE1rm(0.95, 80, 40, 1, 10)
  it('work week: a top set + backoff sets, each carrying system + added weight', () => {
    const { sets } = expandStreetLift({ sysE1rm, k: 0.95, bodyweight: 80, baseSets: 4 })
    expect(sets[0].label).toBe('탑')
    expect(sets.filter((s) => s.label === '백오프')).toHaveLength(3)
    for (const s of sets) {
      expect(typeof s.systemWeight).toBe('number')
      expect(typeof s.addedWeight).toBe('number')
      expect(['belt', 'bodyweight', 'assisted']).toContain(s.mode)
    }
  })
  it('backoffRpeDrop lowers the backoff system weight without throwing, top set unchanged', () => {
    const a = expandStreetLift({ sysE1rm, k: 0.95, bodyweight: 80, baseSets: 4, backoffRpeDrop: 0 })
    const b = expandStreetLift({ sysE1rm, k: 0.95, bodyweight: 80, baseSets: 4, backoffRpeDrop: 2.5 })
    expect(b.sets[0].systemWeight).toBe(a.sets[0].systemWeight)         // top untouched
    expect(b.sets[1].systemWeight).toBeLessThanOrEqual(a.sets[1].systemWeight)
  })
  it('deload: half the sets at RPE 6', () => {
    const { sets } = expandStreetLift({ sysE1rm, k: 0.95, bodyweight: 80, baseSets: 4, isDeload: true })
    expect(sets.length).toBeLessThanOrEqual(2)
    expect(sets.every((s) => s.rpe === 6)).toBe(true)
  })
  it('assisted mode reports assistKg when added load is negative', () => {
    // tiny system relative to bodyweight → top weight below k·BW → assisted
    const lowE1rm = streetSystemE1rm(0.95, 100, 0, 8, 8)
    const { sets } = expandStreetLift({ sysE1rm: lowE1rm, k: 0.95, bodyweight: 100, baseSets: 2 })
    const assisted = sets.filter((s) => s.mode === 'assisted')
    for (const s of assisted) expect(s.assistKg).toBeGreaterThan(0)
  })
})

describe('buildStreetWeek', () => {
  const street = {
    enabled: true, k: { dip: 0.95, pullup: 0.90 }, frequency: { dip: 2, pullup: 2 },
    dip: { added: 40, reps: 1, rpe: 10 },
    pullup: { added: 30, reps: 1, rpe: 10, grip: 'supine' },
  }
  it('builds both lifts when inputs complete', () => {
    const out = buildStreetWeek(street, 80, 0, 4, {})
    expect(out.map((l) => l.lift)).toEqual(['dip', 'pullup'])
    expect(out[0].scheme.note).toMatch(/벨트/)
  })
  it('skips a lift with incomplete inputs', () => {
    const partial = { ...street, pullup: { added: null, reps: 1, rpe: 10 } }
    expect(buildStreetWeek(partial, 80, 0, 4, {}).map((l) => l.lift)).toEqual(['dip'])
  })
  it('disabled or no bodyweight → empty', () => {
    expect(buildStreetWeek({ ...street, enabled: false }, 80, 0, 4, {})).toEqual([])
    expect(buildStreetWeek(street, null, 0, 4, {})).toEqual([])
  })
  it('the two street lifts are NOT main lifts', () => {
    for (const def of STREET_LIFTS) expect(MAIN_LIFTS).not.toContain(def.key)
  })
})

describe('generate — street integration', () => {
  const profile = {
    years: 2, daysPerWeek: 4, fatigue: 2, mesoWeeks: 4, deloadEnabled: true, bodyweight: 80,
    lifts: { squat: { oneRM: 180 }, bench: { oneRM: 120 }, deadlift: { oneRM: 220 } },
  }
  it('disabled (default) → no street key, byte-identical to plain plan', () => {
    const a = JSON.stringify(generate(profile))
    const b = JSON.stringify(generate({ ...profile, streetLifting: { enabled: false, k: { dip: 0.95, pullup: 0.9 }, frequency: {}, dip: {}, pullup: {} } }))
    expect(b).toBe(a)
    expect(generate(profile).weeks.every((w) => w.street === undefined)).toBe(true)
  })
  it('enabled with bodyweight → every week carries a street block with added weights', () => {
    const plan = generate({
      ...profile,
      streetLifting: { enabled: true, k: { dip: 0.95, pullup: 0.9 }, frequency: { dip: 2, pullup: 2 }, dip: { added: 40, reps: 1, rpe: 10 }, pullup: { added: 30, reps: 1, rpe: 10, grip: 'pronated' } },
    })
    for (const wk of plan.weeks) {
      expect(Array.isArray(wk.street)).toBe(true)
      expect(wk.street.length).toBe(2)
      expect(wk.street[0].scheme.sets[0]).toHaveProperty('addedWeight')
    }
  })
  it('enabled but no bodyweight → no street key (safe)', () => {
    const plan = generate({ ...profile, bodyweight: null, streetLifting: { enabled: true, k: { dip: 0.95, pullup: 0.9 }, frequency: {}, dip: { added: 40, reps: 1, rpe: 10 }, pullup: {} } })
    expect(plan.weeks.every((w) => w.street === undefined)).toBe(true)
  })
})
