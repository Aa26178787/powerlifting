import { describe, it, expect } from 'vitest'
import { defaultFrequency, recommendedFrequency } from './frequency.js'
import { PRESETS } from './quality.js'

describe('defaultFrequency', () => {
  it('preserves the legacy distribution', () => {
    expect(defaultFrequency(4)).toEqual({ squat: 2, bench: 2, deadlift: 1 })
    expect(defaultFrequency(5)).toEqual({ squat: 2, bench: 2, deadlift: 2 })
    expect(defaultFrequency(6)).toEqual({ squat: 2, bench: 3, deadlift: 2 })
  })
})

describe('recommendedFrequency', () => {
  it('hypertrophy blend → identical to defaultFrequency (frequency = volume distribution only)', () => {
    expect(recommendedFrequency(PRESETS.bodybuilding, 5)).toEqual(defaultFrequency(5))
  })
  it('strength-dominant blend with room → +1 squat frequency vs default', () => {
    const def = defaultFrequency(5)
    const rec = recommendedFrequency(PRESETS.powerlifting, 5)
    expect(rec.squat).toBe(def.squat + 1) // strength benefits independently from frequency (강)
  })
  it('no room (daysPerWeek 3) → does not exceed default (bit-identical)', () => {
    expect(recommendedFrequency(PRESETS.powerlifting, 3)).toEqual(defaultFrequency(3))
  })
})
