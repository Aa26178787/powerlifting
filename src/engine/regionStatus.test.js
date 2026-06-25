import { describe, it, expect } from 'vitest'
import { STATUS_SCALE, regionMaxStatus, volumeScale, shouldAvoid, shouldSwap } from './regionStatus.js'

const dl = { name: 'Conventional Deadlift', stress: ['lowerBack', 'hamstring'] }
const curl = { name: 'Barbell Curl', stress: ['elbow', 'bicepsTendon'] }

describe('regionStatus', () => {
  it('takes the worst region affecting the exercise', () => {
    expect(regionMaxStatus(dl, { lowerBack: 2, hamstring: 1 })).toBe(2)
    expect(regionMaxStatus(curl, { lowerBack: 3 })).toBe(0) // curl does not stress lowerBack
  })
  it('volume scales by worst status', () => {
    expect(volumeScale(dl, { lowerBack: 0 })).toBe(1.0)
    expect(volumeScale(dl, { lowerBack: 1 })).toBe(0.85)
    expect(volumeScale(dl, { lowerBack: 2 })).toBe(0.6)
    expect(volumeScale(dl, { lowerBack: 3 })).toBe(0.0)
  })
  it('swap at 2, avoid at 3', () => {
    expect(shouldSwap(dl, { lowerBack: 2 })).toBe(true)
    expect(shouldAvoid(dl, { lowerBack: 2 })).toBe(false)
    expect(shouldAvoid(dl, { lowerBack: 3 })).toBe(true)
  })
})
