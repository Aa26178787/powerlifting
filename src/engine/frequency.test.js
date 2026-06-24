import { describe, it, expect } from 'vitest'
import { desiredFrequency } from './frequency.js'

describe('desiredFrequency', () => {
  it('3 days/week: squat 2, bench 2, deadlift 1', () => {
    expect(desiredFrequency('strength', 3)).toEqual({ squat: 2, bench: 2, deadlift: 1 })
  })
  it('5 days/week: deadlift rises to 2', () => {
    expect(desiredFrequency('strength', 5)).toEqual({ squat: 2, bench: 2, deadlift: 2 })
  })
  it('6 days/week: bench rises to 3', () => {
    expect(desiredFrequency('strength', 6)).toEqual({ squat: 2, bench: 3, deadlift: 2 })
  })
})
