import { describe, it, expect } from 'vitest'
import { SCHEMES, clampBackoffRpe } from './setSchemes.js'
import { ZONES } from './quality.js'
import { generate } from './generate.js'

const E1RM = 100
const baseCtx = (extra) => ({ e1rm: E1RM, zone: ZONES.strength, baseSets: 4, ...extra })
const topOf = (sets) => sets.find((s) => /탑/.test(s.label ?? ''))
const backoffsOf = (sets) => sets.filter((s) => /백오프/.test(s.label ?? ''))

describe('clampBackoffRpe', () => {
  it('snaps to 0.5 and clamps to [6,10]', () => {
    expect(clampBackoffRpe(7.5)).toBe(7.5)
    expect(clampBackoffRpe(5.4)).toBe(6)      // below floor → 6
    expect(clampBackoffRpe(11)).toBe(10)      // above ceiling → 10
    expect(clampBackoffRpe(7.3)).toBe(7.5)    // snap up
    expect(clampBackoffRpe(7.2)).toBe(7)      // snap down
  })
})

describe('backoffRpeDrop knob — backward compatibility', () => {
  for (const key of ['topSetBackoff', 'topSingleBackoff', 'strengthHypertrophy']) {
    it(`${key}: drop:0 is identical to omitting the param`, () => {
      const a = SCHEMES[key].expand(baseCtx())
      const b = SCHEMES[key].expand(baseCtx({ backoffRpeDrop: 0 }))
      expect(b).toEqual(a)
    })
  }
})

describe('backoffRpeDrop knob — lighter-only effect', () => {
  it('topSetBackoff: larger drop lowers backoff weight, top set unchanged', () => {
    const s0 = SCHEMES.topSetBackoff.expand(baseCtx({ backoffRpeDrop: 0 })).sets
    const s1 = SCHEMES.topSetBackoff.expand(baseCtx({ backoffRpeDrop: 1 })).sets
    const s2 = SCHEMES.topSetBackoff.expand(baseCtx({ backoffRpeDrop: 2 })).sets
    expect(topOf(s1).weight).toBe(topOf(s0).weight)        // top untouched
    expect(backoffsOf(s1)[0].weight).toBeLessThan(backoffsOf(s0)[0].weight)
    expect(backoffsOf(s2)[0].weight).toBeLessThanOrEqual(backoffsOf(s1)[0].weight)
    expect(backoffsOf(s1)[0].rpe).toBeLessThan(backoffsOf(s0)[0].rpe)
  })
  it('topSingleBackoff: drop lowers backoff, top single unchanged', () => {
    const s0 = SCHEMES.topSingleBackoff.expand(baseCtx({ backoffRpeDrop: 0 })).sets
    const s1 = SCHEMES.topSingleBackoff.expand(baseCtx({ backoffRpeDrop: 1 })).sets
    expect(s1.find((x) => x.label === '탑싱글').weight).toBe(s0.find((x) => x.label === '탑싱글').weight)
    expect(backoffsOf(s1)[0].weight).toBeLessThan(backoffsOf(s0)[0].weight)
  })
  it('strengthHypertrophy: drop lowers the 근비대 backoff weight', () => {
    const s0 = SCHEMES.strengthHypertrophy.expand(baseCtx({ backoffRpeDrop: 0 })).sets
    const s1 = SCHEMES.strengthHypertrophy.expand(baseCtx({ backoffRpeDrop: 1 })).sets
    const b0 = s0.find((x) => /백오프/.test(x.label))
    const b1 = s1.find((x) => /백오프/.test(x.label))
    expect(b1.weight).toBeLessThan(b0.weight)
  })
})

describe('backoffPct — user-set backoff weight as a fraction of the top set', () => {
  const round = (x) => Math.round(x / 2.5) * 2.5
  it('topSetBackoff: backoff weight = round(top × pct), top unchanged', () => {
    const s0 = SCHEMES.topSetBackoff.expand(baseCtx()).sets
    const s = SCHEMES.topSetBackoff.expand(baseCtx({ backoffPct: 0.8 })).sets
    const top = topOf(s).weight
    expect(topOf(s).weight).toBe(topOf(s0).weight)          // top untouched
    expect(backoffsOf(s).every((x) => x.weight === round(top * 0.8))).toBe(true)
  })
  it('strengthHypertrophy + topSingleBackoff honor backoffPct', () => {
    const sh = SCHEMES.strengthHypertrophy.expand(baseCtx({ backoffPct: 0.75 })).sets
    const shTop = sh.find((x) => /탑/.test(x.label)).weight
    expect(sh.find((x) => /백오프/.test(x.label)).weight).toBe(round(shTop * 0.75))
    const ts = SCHEMES.topSingleBackoff.expand(baseCtx({ backoffPct: 0.7 })).sets
    const tsTop = ts.find((x) => x.label === '탑싱글').weight
    expect(backoffsOf(ts)[0].weight).toBe(round(tsTop * 0.7))
  })
  it('backoffPct null → identical to omitting it', () => {
    for (const key of ['topSetBackoff', 'topSingleBackoff', 'strengthHypertrophy']) {
      expect(SCHEMES[key].expand(baseCtx({ backoffPct: null }))).toEqual(SCHEMES[key].expand(baseCtx()))
    }
  })
})

describe('generate — per-lift backoffPct', () => {
  const profile = {
    years: 2, daysPerWeek: 4, fatigue: 2, mesoWeeks: 3, deloadEnabled: false,
    lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
    qualities: { power: 0.1, strength: 0.7, hypertrophy: 0.2, endurance: 0 },
  }
  it('empty backoffPct → byte-identical to no override', () => {
    expect(JSON.stringify(generate({ ...profile, backoffPct: {} }))).toBe(JSON.stringify(generate(profile)))
  })
  it('a lift with backoffPct set → its backoff sets are that fraction of the top', () => {
    const plan = generate({ ...profile, backoffPct: { squat: 0.7 } })
    for (const wk of plan.weeks) for (const s of wk.sessions) for (const e of s.exercises) {
      if (e.baseLift !== 'squat') continue
      const sets = e.scheme.sets
      const top = sets.find((x) => /탑/.test(x.label ?? ''))
      const backs = sets.filter((x) => /백오프/.test(x.label ?? ''))
      if (top && backs.length) {
        const expected = Math.round((top.weight * 0.7) / 2.5) * 2.5
        expect(backs.every((b) => b.weight === expected)).toBe(true)
      }
    }
  })
})

describe('backoffRpeDrop knob — chart-domain safety (fuzz)', () => {
  const profile = {
    years: 2, daysPerWeek: 4, fatigue: 2,
    lifts: { squat: { oneRM: 180 }, bench: { oneRM: 120 }, deadlift: { oneRM: 220 } },
    qualities: { power: 0, strength: 0.5, hypertrophy: 0.4, endurance: 0.1 },
  }
  for (const drop of [0, 0.5, 1, 1.5, 2, 2.5]) {
    it(`generate() does not throw at backoffRpeDrop=${drop} and stays at/below baseline backoff weight`, () => {
      expect(() => generate({ ...profile, backoffRpeDrop: drop })).not.toThrow()
    })
  }
  it('generate() with backoffRpeDrop:0 equals generate() with the field omitted', () => {
    const a = JSON.stringify(generate(profile))
    const b = JSON.stringify(generate({ ...profile, backoffRpeDrop: 0 }))
    expect(b).toBe(a)
  })
})
