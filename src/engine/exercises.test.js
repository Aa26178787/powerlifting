import { describe, it, expect } from 'vitest'
import { MAIN_LIFTS, substitute, filterByEquipment, accessoriesFor } from './exercises.js'

describe('MAIN_LIFTS', () => {
  it('lists the three competition lifts', () => {
    expect(MAIN_LIFTS).toEqual(['squat','bench','deadlift'])
  })
})

describe('substitute', () => {
  it('swaps squat to box squat for a knee injury', () => {
    expect(substitute('squat', ['knee'])).toBe('box squat')
  })
  it('returns the original lift when no injury applies', () => {
    expect(substitute('bench', ['knee'])).toBe('bench')
  })
})

describe('filterByEquipment', () => {
  it('keeps only exercises whose equipment is all available', () => {
    expect(filterByEquipment(['squat','leg press'], ['barbell','rack']))
      .toEqual(['squat'])
  })
})

describe('accessoriesFor', () => {
  it('returns accessories mapped to the bench', () => {
    expect(accessoriesFor('bench')).toEqual(['dumbbell bench','floor press'])
  })
})
