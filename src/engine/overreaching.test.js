import { describe, it, expect } from 'vitest'
import { detectOverreaching } from './overreaching.js'
describe('detectOverreaching', () => {
  it('no flag under 3 entries', () => {
    expect(detectOverreaching([{ readiness: 0.2 }, { readiness: 0.1 }]).flag).toBe(false)
  })
  it('flags 3 consecutive declining + all <0.5', () => {
    expect(detectOverreaching([{ readiness: 0.49 }, { readiness: 0.4 }, { readiness: 0.3 }]).flag).toBe(true)
  })
  it('flags persistently very low', () => {
    expect(detectOverreaching([{ readiness: 0.3 }, { readiness: 0.34 }, { readiness: 0.2 }]).flag).toBe(true)
  })
  it('no flag when healthy', () => {
    expect(detectOverreaching([{ readiness: 0.9 }, { readiness: 0.8 }, { readiness: 0.85 }]).flag).toBe(false)
  })
})
