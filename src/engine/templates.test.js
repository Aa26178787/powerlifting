import { describe, it, expect } from 'vitest'
import { ROLE, TEMPLATES, getTemplate } from './templates.js'

describe('ROLE', () => {
  it('defines heavy as a low-rep, RPE-8 start', () => {
    expect(ROLE.heavy).toEqual({ reps: 3, rpeStart: 8 })
  })
  it('defines volume as a mid-rep, RPE-7.5 start', () => {
    expect(ROLE.volume).toEqual({ reps: 6, rpeStart: 7.5 })
  })
  it('defines light as a mid-rep, RPE-7 start', () => {
    expect(ROLE.light).toEqual({ reps: 5, rpeStart: 7 })
  })
  it('defines hyper as a high-rep, RPE-7.5 start', () => {
    expect(ROLE.hyper).toEqual({ reps: 10, rpeStart: 7.5 })
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

import { slotTypeForRole } from './templates.js'

describe('slotTypeForRole', () => {
  it('heavy is a competition slot, others are variation slots', () => {
    expect(slotTypeForRole('heavy')).toBe('comp')
    expect(slotTypeForRole('volume')).toBe('variation')
    expect(slotTypeForRole('light')).toBe('variation')
    expect(slotTypeForRole('hyper')).toBe('variation')
  })
})
