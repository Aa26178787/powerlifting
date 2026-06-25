import { describe, it, expect } from 'vitest'
import { pick, styleToken } from './variations.js'

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
})
