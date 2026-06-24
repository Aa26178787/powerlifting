import { describe, it, expect } from 'vitest'
import { selectTemplate } from './selector.js'

describe('selectTemplate', () => {
  it('hypertrophy goal always picks the hypertrophy block', () => {
    expect(selectTemplate({ goal: 'hypertrophy', years: 8, daysPerWeek: 6 })).toBe('hypertrophyBlock')
  })
  it('a true beginner picks linear progression', () => {
    expect(selectTemplate({ goal: 'strength', years: 0.5, daysPerWeek: 3 })).toBe('linearLP')
  })
  it('a high-frequency strength lifter picks high frequency', () => {
    expect(selectTemplate({ goal: 'strength', years: 3, daysPerWeek: 5 })).toBe('highFreqPct')
  })
  it('a low-frequency strength lifter picks 5/3/1', () => {
    expect(selectTemplate({ goal: 'strength', years: 3, daysPerWeek: 4 })).toBe('fiveThreeOne')
  })
  it('an intermediate balanced lifter picks DUP', () => {
    expect(selectTemplate({ goal: 'balanced', years: 3, daysPerWeek: 4 })).toBe('dup')
  })
})
