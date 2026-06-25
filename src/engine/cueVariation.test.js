import { describe, it, expect } from 'vitest'
import { cueVariation, CUE_KEYS, CUE_VARIATIONS } from './cueVariation.js'
import { byName } from './exercises.js'

describe('cueVariation', () => {
  it('deadlift leg-drive cue prescribes the T2K deadlift', () => {
    expect(cueVariation('deadlift', 'legDrive')).toBe('Tempo to Knees Deadlift (T2K)')
  })
  it('returns null for no cue or unknown cue', () => {
    expect(cueVariation('squat', null)).toBeNull()
    expect(cueVariation('squat', 'nonsense')).toBeNull()
  })
  it('every mapped cue target exists in the exercise DB', () => {
    for (const lift of Object.keys(CUE_VARIATIONS)) {
      for (const key of CUE_KEYS[lift]) {
        const name = cueVariation(lift, key)
        expect(name, `${lift}/${key}`).toBeTruthy()
        expect(byName(name), `${name} in DB`).toBeTruthy()
      }
    }
  })
})
