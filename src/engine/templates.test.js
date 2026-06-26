import { describe, it, expect } from 'vitest'
import { slotTypeForRole } from './templates.js'

describe('slotTypeForRole', () => {
  it('heavy is a competition slot, others are variation slots', () => {
    expect(slotTypeForRole('heavy')).toBe('comp')
    expect(slotTypeForRole('volume')).toBe('variation')
    expect(slotTypeForRole('light')).toBe('variation')
    expect(slotTypeForRole('hyper')).toBe('variation')
  })
})
