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
  it('flags steep crash (0.7→0.45→0.3) via cumulative drop rule', () => {
    expect(detectOverreaching([{ readiness: 0.7 }, { readiness: 0.45 }, { readiness: 0.3 }]).flag).toBe(true)
  })
  it('flags plateau-then-drop (0.4,0.4,0.3) via sustained-low rule', () => {
    expect(detectOverreaching([{ readiness: 0.4 }, { readiness: 0.4 }, { readiness: 0.3 }]).flag).toBe(true)
  })
  it('out-of-order check-ins: detects trend by {week,day} order, not insertion order', () => {
    // Logged week3 first, then week1, then week2 — out of training order.
    const log = [
      { week: 3, day: 1, readiness: 0.3 },  // worst (week 3)
      { week: 1, day: 1, readiness: 0.49 }, // best  (week 1)
      { week: 2, day: 1, readiness: 0.4 },  // mid   (week 2)
    ]
    // After sorting by week: [0.49, 0.4, 0.3] → strictly declining, all <0.5 → flag
    // Broken (slice(-3) insertion order): [0.3, 0.49, 0.4] → not declining → no flag
    expect(detectOverreaching(log).flag).toBe(true)
  })
})
