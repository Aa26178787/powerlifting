import { describe, it, expect } from 'vitest'
import { toDisplay, fromInput, unitLabel, LB_PER_KG } from './units.js'

describe('units', () => {
  it('kg passes through (round to 2.5 for prescription)', () => {
    expect(toDisplay(162.5, 'kg')).toBe(162.5)
    expect(toDisplay(161, 'kg')).toBe(160)
  })
  it('lbs converts and rounds to 5 for prescription', () => {
    expect(toDisplay(100, 'lbs')).toBe(220)        // 220.46 → 220
    expect(toDisplay(102.5, 'lbs')).toBe(225)      // 225.97 → 225
  })
  it('input mode keeps 1 decimal (no plate snap)', () => {
    expect(toDisplay(182.8, 'lbs', false)).toBe(403)   // 403.0, not snapped to 400/405
    expect(toDisplay(183.7, 'kg', false)).toBe(183.7)
  })
  it('fromInput converts to kg', () => {
    expect(fromInput('405', 'lbs')).toBeCloseTo(405 / LB_PER_KG, 4)
    expect(fromInput('200', 'kg')).toBe(200)
    expect(fromInput('', 'kg')).toBeNull()
  })
  it('round-trips an lbs input back to ~the same display value', () => {
    const kg = fromInput('405', 'lbs')
    expect(toDisplay(kg, 'lbs', false)).toBe(405)
  })
  it('unitLabel', () => {
    expect(unitLabel('lbs')).toBe('lbs')
    expect(unitLabel('kg')).toBe('kg')
  })
})
