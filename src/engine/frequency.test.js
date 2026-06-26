import { describe, it, expect } from 'vitest'
import { defaultFrequency } from './frequency.js'

describe('defaultFrequency', () => {
  it('preserves the legacy distribution', () => {
    expect(defaultFrequency(4)).toEqual({ squat: 2, bench: 2, deadlift: 1 })
    expect(defaultFrequency(5)).toEqual({ squat: 2, bench: 2, deadlift: 2 })
    expect(defaultFrequency(6)).toEqual({ squat: 2, bench: 3, deadlift: 2 })
  })
})
