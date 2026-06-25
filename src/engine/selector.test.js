import { describe, it, expect } from 'vitest'
import { selectTemplate } from './selector.js'

const B = (o) => ({ power:0, strength:0, hypertrophy:0, endurance:0, ...o })

describe('selectTemplate (blend)', () => {
  it('hypertrophy-dominant -> hypertrophyBlock', () => {
    expect(selectTemplate({ blend: B({ hypertrophy: 1 }), years: 8, daysPerWeek: 6 })).toBe('hypertrophyBlock')
  })
  it('beginner -> linearLP', () => {
    expect(selectTemplate({ blend: B({ strength: 1 }), years: 0.5, daysPerWeek: 3 })).toBe('linearLP')
  })
  it('strength-dominant high-freq -> highFreqPct', () => {
    expect(selectTemplate({ blend: B({ strength: 1 }), years: 3, daysPerWeek: 5 })).toBe('highFreqPct')
  })
  it('strength-dominant low-freq -> fiveThreeOne', () => {
    expect(selectTemplate({ blend: B({ strength: 1 }), years: 3, daysPerWeek: 4 })).toBe('fiveThreeOne')
  })
  it('balanced intermediate -> dup', () => {
    expect(selectTemplate({ blend: B({ strength: 0.3, hypertrophy: 0.3, power: 0.2, endurance: 0.2 }), years: 3, daysPerWeek: 4 })).toBe('dup')
  })
})
