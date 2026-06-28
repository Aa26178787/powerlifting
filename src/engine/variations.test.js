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

const EQUIP = ['barbell', 'rack', 'bench', 'dumbbell', 'machine', 'cables']

describe('variation stability (systematic, not random — B7)', () => {
  it('same inputs → same variation (deterministic; no week churn)', () => {
    const a = pick('squat', 'none', { bar: 'low' }, EQUIP, true, [])
    const b = pick('squat', 'none', { bar: 'low' }, EQUIP, true, [])
    expect(a?.name).toBe(b?.name)
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

// ── Case 8: 2D cause matching in variations ───────────────────────────────────
describe('2D cause matching in pick (case 8)', () => {
  it('cause-match variation scores 3 > position-only 2 > no-match 0', () => {
    // DL bottom, stance='sumo' (no sumo-specific variations in [barbell, trap bar] pool),
    // cause='quads':
    //   Trap Bar DL (high handles): sp='bottom', pm='quads/glutes' → causeOf=['quads']
    //     → position(2) + cause(1) = 3
    //   All barbell DL bottom vars:  pm=hamstrings|upper-back → causeOf≠'quads'
    //     → position(2) + style-sumo-miss(0) = 2
    // → Trap Bar DL wins
    const eq = ['barbell', 'trap bar']
    const v = pick('deadlift', 'bottom', { stance: 'sumo' }, eq, false, [], 'quads')
    expect(v).not.toBeNull()
    expect(v.name).toBe('Trap Bar Deadlift (high handles)')
  })

  it('specialty gate (score≥2) is preserved — cause alone (no position) does not elevate specialty', () => {
    // position='none' → stickingPoint block not entered → cause match unreachable → score stays 0
    // Box Squat (specialty) must NOT be picked first even if cause='hip' (its override)
    const v = pick('squat', 'none', { bar: 'low' }, ['barbell', 'rack', 'box'], false, [], 'hip')
    expect(v).not.toBeNull()
    expect(v.name).not.toMatch(/Box Squat/)
  })

  it('cause=undefined preserves existing position-only ranking (regression)', () => {
    const eq = ['barbell', 'rack', 'deficit']
    const withCause   = pick('deadlift', 'bottom', { stance: 'conventional' }, eq, false)
    const withUndef   = pick('deadlift', 'bottom', { stance: 'conventional' }, eq, false, [], undefined)
    // Both should return the same exercise (no cause tiebreaker applied)
    expect(withUndef?.name).toBe(withCause?.name)
  })
})
