import { describe, it, expect } from 'vitest'
import { ELITE_REL, relStandard, weakLift, glPoints, levelBand, assess, recommendBlend } from './standards.js'

describe('relStandard', () => {
  it('a male squatting 2.83x bodyweight is at 1.0 of the elite standard', () => {
    expect(relStandard('squat', 283, 100, 'M')).toBeCloseTo(1.0, 3)
  })
  it('null when 1RM missing', () => { expect(relStandard('bench', 0, 100, 'M')).toBeNull() })
  it('null for negative oneRM', () => { expect(relStandard('squat', -200, 100, 'M')).toBeNull() })
  it('null for negative bodyweight', () => { expect(relStandard('squat', 200, -100, 'M')).toBeNull() })
})

describe('weakLift', () => {
  it('flags the lift furthest below its own standard', () => {
    // squat 2.83x (1.0), deadlift 3.25x (1.0), bench 1.5x → 1.5/1.95=0.77 lowest
    expect(weakLift({ squat: 283, bench: 150, deadlift: 325 }, 100, 'M')).toBe('bench')
  })
  it('proportional lifts do NOT auto-flag bench', () => {
    // all at exactly elite standard -> all relStandard 1.0 -> tie -> bench first; but make squat slightly lowest
    expect(weakLift({ squat: 270, bench: 195, deadlift: 325 }, 100, 'M')).toBe('squat')
  })
  it('null when a lift is missing', () => {
    expect(weakLift({ squat: 200, bench: 0, deadlift: 250 }, 100, 'M')).toBeNull()
  })
})

describe('glPoints', () => {
  it('computes a positive GL score for a 500kg male total at 100kg', () => {
    const gl = glPoints(500, 100, 'M')
    expect(gl).toBeGreaterThan(40)
    expect(gl).toBeLessThan(120)
  })
  it('null for zero bodyweight', () => { expect(glPoints(500, 0, 'M')).toBeNull() })
  it('null for negative bodyweight', () => { expect(glPoints(500, -50, 'F')).toBeNull() })
  it('null for sub-floor bodyweight where denominator goes negative (female, 10 kg)', () => {
    expect(glPoints(500, 10, 'F')).toBeNull()
  })
  it('null for negative total', () => { expect(glPoints(-100, 80, 'M')).toBeNull() })
})

describe('levelBand', () => {
  it('maps fractions to bands', () => {
    expect(levelBand(0.3)).toBe('입문')
    expect(levelBand(0.5)).toBe('초중급')
    expect(levelBand(0.95)).toBe('엘리트급')
  })
})

describe('assess', () => {
  it('returns perLift, weakLift, gl, level', () => {
    const a = assess({ squat: 200, bench: 120, deadlift: 240 }, 90, 'M')
    expect(a.weakLift).toBeDefined()
    expect(typeof a.glPoints).toBe('number')
    expect(typeof a.level).toBe('string')
    expect(a.perLift.squat).toBeGreaterThan(0)
  })
  it('null when bodyweight missing', () => {
    expect(assess({ squat: 200, bench: 120, deadlift: 240 }, null, 'M')).toBeNull()
  })
})

describe('recommendBlend', () => {
  it('beginner strength-leaning', () => { expect(recommendBlend(0.5).strength).toBe(0.6) })
  it('intermediate powerbuilding', () => {
    const b = recommendBlend(2)
    expect(b.strength).toBe(0.45); expect(b.hypertrophy).toBe(0.45)
  })
})
