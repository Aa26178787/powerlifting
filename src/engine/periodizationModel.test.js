import { describe, it, expect } from 'vitest'
import { MODELS, recommendModel, weekPlan } from './periodizationModel.js'

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
