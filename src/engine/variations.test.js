import { describe, it, expect } from 'vitest'
import { pick, styleToken, priorityOf } from './variations.js'

describe('styleToken', () => {
  it('maps squat/deadlift styles', () => {
    expect(styleToken('squat', { bar: 'low' })).toBe('low-bar')
    expect(styleToken('deadlift', { stance: 'sumo' })).toBe('sumo')
    expect(styleToken('bench', { grip: 'close' })).toBe('')
  })
})

describe('pick', () => {
  it('returns a deadlift variation addressing the off-floor (bottom) region', () => {
    const v = pick('deadlift', 'bottom', { stance: 'conventional' }, ['barbell', 'deficit'], false)
    expect(v).not.toBeNull()
    expect(v.category).toBe('variation')
    expect(v.targetLift).toBe('deadlift')
    expect(v.stickingPoint).toBe('bottom')
  })
  it('never returns advanced (band/chain) work when advanced=false', () => {
    const v = pick('squat', 'lockout', { bar: 'low' }, ['barbell','rack','bands'], false)
    if (v) expect(v.advanced).not.toBe(true)
  })
  it('returns null when equipment rules out every variation', () => {
    const v = pick('bench', 'lockout', { grip: 'close' }, ['nonexistent-gear'], false)
    expect(v).toBeNull()
  })
  it('excludes named exercises from the pool', () => {
    const eq = ['barbell', 'rack', 'box', 'pins', 'deficit', 'blocks', 'cables', 'dumbbells']
    const chosen = pick('squat', 'bottom', { bar: 'low' }, eq, true)
    expect(chosen).not.toBeNull()
    const without = pick('squat', 'bottom', { bar: 'low' }, eq, true, [chosen.name])
    expect(without?.name).not.toBe(chosen.name)
  })
})

import { allEquipment } from './exercises.js'

describe('priorityOf + tie-break', () => {
  it('specialty variations rank after standard ones', () => {
    expect(priorityOf({ name: 'Box Squat (below parallel)' })).toBe(70)
    expect(priorityOf({ name: 'Pause Squat (bottom)' })).toBe(40)
  })
  it('explicit priority field wins', () => {
    expect(priorityOf({ name: 'Box Squat', priority: 5 })).toBe(5)
  })
  it('low-bar squat with no sticking point does NOT default to Box Squat', () => {
    const v = pick('squat', 'none', { bar: 'low' }, allEquipment(), false, [])
    expect(v).not.toBeNull()
    expect(v.name).not.toMatch(/Box Squat/)
  })
})
