import { describe, it, expect } from 'vitest'
import { ROLE, TEMPLATES, getTemplate } from './templates.js'

describe('ROLE', () => {
  it('defines heavy as a low-rep, RPE-8 start', () => {
    expect(ROLE.heavy).toEqual({ reps: 3, rpeStart: 8 })
  })
})

describe('TEMPLATES', () => {
  it('includes all five template keys', () => {
    expect(Object.keys(TEMPLATES).sort()).toEqual(
      ['dup','fiveThreeOne','highFreqPct','hypertrophyBlock','linearLP']
    )
  })
  it('dup has a 3-day layout with each day carrying slots', () => {
    const layout = TEMPLATES.dup.layouts[3]
    expect(layout).toHaveLength(3)
    expect(layout[0].length).toBeGreaterThan(0)
    expect(layout[0][0]).toHaveProperty('lift')
    expect(layout[0][0]).toHaveProperty('role')
  })
  it('linearLP and hypertrophyBlock cover all of days 3-6 (no selector gap)', () => {
    for (const days of [3, 4, 5, 6]) {
      expect(TEMPLATES.linearLP.layouts[days]).toBeDefined()
      expect(TEMPLATES.linearLP.layouts[days]).toHaveLength(days)
      expect(TEMPLATES.hypertrophyBlock.layouts[days]).toBeDefined()
      expect(TEMPLATES.hypertrophyBlock.layouts[days]).toHaveLength(days)
    }
  })
  it('dup covers all of days 3-6', () => {
    for (const days of [3, 4, 5, 6]) {
      expect(TEMPLATES.dup.layouts[days]).toHaveLength(days)
    }
  })
})

describe('getTemplate', () => {
  it('throws on an unknown key', () => {
    expect(() => getTemplate('nope')).toThrow()
  })
})
