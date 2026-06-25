import { describe, it, expect } from 'vitest'
import { MODELS, recommendModel, weekPlan, phaseFor, weekOffset } from './periodizationModel.js'

describe('recommendModel', () => {
  it('a meet date recommends block', () => {
    expect(recommendModel({ competition: { on: true, date: '2026-09-01' }, blend: { power:0, strength:0.5, hypertrophy:0.5, endurance:0 } })).toBe('block')
  })
  it('no meet, strength-dominant recommends linear', () => {
    expect(recommendModel({ competition: { on: false }, blend: { power:0.1, strength:0.7, hypertrophy:0.2, endurance:0 } })).toBe('linear')
  })
  it('no meet, balanced recommends undulating', () => {
    expect(recommendModel({ competition: { on: false }, blend: { power:0.15, strength:0.3, hypertrophy:0.4, endurance:0.15 } })).toBe('undulating')
  })
  it('a stall recommends block', () => {
    expect(recommendModel({ competition: { on: false }, blend: { power:0, strength:0.5, hypertrophy:0.5, endurance:0 }, progressTrend: 'stall' })).toBe('block')
  })
})

describe('weekPlan', () => {
  const blend = { power: 0, strength: 0.5, hypertrophy: 0.5, endurance: 0 }
  it('undulating spreads the full blend each week', () => {
    expect(weekPlan('undulating', 0, blend, { on: false }).blend).toEqual(blend)
  })
  it('block concentrates one quality per week (rotating)', () => {
    const w0 = weekPlan('block', 0, blend, { on: false }).blend
    const w1 = weekPlan('block', 1, blend, { on: false }).blend
    const onehot = (b) => Object.values(b).filter((v) => v === 1).length
    expect(onehot(w0)).toBe(1)
    expect(onehot(w1)).toBe(1)
    // different emphasis across weeks
    expect(w0).not.toEqual(w1)
  })
  it('rpeOffset follows the wave', () => {
    expect(weekPlan('linear', 2, blend, { on: false }).rpeOffset).toBe(1.0)
  })
})

describe('adaptive hybrid', () => {
  const even = { power: 0.25, strength: 0.25, hypertrophy: 0.25, endurance: 0.25 }
  const strengthDom = { power: 0.1, strength: 0.7, hypertrophy: 0.2, endurance: 0 }

  it("'auto' and unknown values resolve to adaptive", () => {
    expect(weekPlan('auto', 1, strengthDom, { on: false }))
      .toEqual(weekPlan('adaptive', 1, strengthDom, { on: false }))
    expect(weekPlan('nonsense', 1, strengthDom, { on: false }))
      .toEqual(weekPlan('adaptive', 1, strengthDom, { on: false }))
  })

  it('an even blend with no meet stays concurrent in week 1', () => {
    expect(weekPlan('adaptive', 0, even, { on: false }).blend).toEqual(even)
  })

  it('concentrates the dominant quality more in later weeks', () => {
    const w0 = weekPlan('adaptive', 0, strengthDom, { on: false }).blend
    const w2 = weekPlan('adaptive', 2, strengthDom, { on: false }).blend
    expect(w2.strength).toBeGreaterThan(w0.strength)
    expect(w2.strength).toBeGreaterThan(strengthDom.strength)
  })

  it('a meet pulls the blend toward strength peaking', () => {
    const peak = weekPlan('adaptive', 2, even, { on: true, date: '2026-09-01' }).blend
    expect(peak.strength).toBeGreaterThan(even.strength)
  })

  it('keeps the weekly intensity wave', () => {
    expect(weekPlan('adaptive', 0, even, { on: false }).rpeOffset).toBe(0)
    expect(weekPlan('adaptive', 2, even, { on: false }).rpeOffset).toBe(1.0)
  })
})

describe('phaseFor', () => {
  it('maps mesocycle position to phase', () => {
    expect(phaseFor(0, 4, true)).toBe('accumulation')
    expect(phaseFor(3, 4, true)).toBe('peak')
    expect(phaseFor(3, 4, false)).toBe('intensification')
  })
})

describe('week-count scaling', () => {
  const blend = { power: 0, strength: 0.5, hypertrophy: 0.5, endurance: 0 }
  it('weekOffset ramps 0..1 over N weeks', () => {
    expect(weekOffset(0, 3)).toBe(0)
    expect(weekOffset(2, 3)).toBe(1)
    expect(weekOffset(0, 6)).toBe(0)
    expect(weekOffset(5, 6)).toBe(1)
  })
  it('weekPlan with totalWeeks=5 scales the wave', () => {
    expect(weekPlan('linear', 4, blend, { on: false }, 5).rpeOffset).toBe(1)
    expect(weekPlan('linear', 0, blend, { on: false }, 5).rpeOffset).toBe(0)
  })
})
