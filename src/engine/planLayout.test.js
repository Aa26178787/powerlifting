import { describe, it, expect } from 'vitest'
import { planLayout, BLOCK_LEN } from './planLayout.js'

describe('planLayout', () => {
  it('<=8 weeks: one block of work weeks + one trailing deload (current shape)', () => {
    const l = planLayout(4, true)
    expect(l.map((e) => e.kind)).toEqual(['work','work','work','work','deload'])
    expect(l.slice(0,4).every((e) => e.block === 0 && e.blockLen === 4)).toBe(true)
    expect(l.map((e) => e.blockWeek)).toEqual([0,1,2,3,4])
  })
  it('<=8 weeks, deload disabled: no deload entry', () => {
    expect(planLayout(5, false).map((e) => e.kind)).toEqual(['work','work','work','work','work'])
  })
  it('>8 weeks: deload inserted after every block of BLOCK_LEN', () => {
    const l = planLayout(12, true) // 6 work + deload + 6 work + deload
    expect(l.map((e) => e.kind)).toEqual([
      'work','work','work','work','work','work','deload',
      'work','work','work','work','work','work','deload',
    ])
    expect(l[7].block).toBe(1)
    expect(l[7].blockWeek).toBe(0)
    expect(l[7].blockLen).toBe(6)
  })
  it('>8 weeks, uneven remainder: last block holds the remainder', () => {
    const l = planLayout(9, true) // 6 work + deload + 3 work + deload
    expect(l.map((e) => e.kind)).toEqual([
      'work','work','work','work','work','work','deload',
      'work','work','work','deload',
    ])
    expect(l.slice(7,10).every((e) => e.block === 1 && e.blockLen === 3)).toBe(true)
  })
  it('BLOCK_LEN is 6', () => expect(BLOCK_LEN).toBe(6))
})
