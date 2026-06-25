import { describe, it, expect } from 'vitest'
import { compVariant, emphasis } from './style.js'

describe('compVariant', () => {
  it('squat low/high bar', () => {
    expect(compVariant('squat', { bar: 'low' })).toBe('Back Squat (Low Bar)')
    expect(compVariant('squat', { bar: 'high' })).toBe('Back Squat (High Bar)')
  })
  it('deadlift conventional/sumo', () => {
    expect(compVariant('deadlift', { stance: 'conventional' })).toBe('Conventional Deadlift')
    expect(compVariant('deadlift', { stance: 'sumo' })).toBe('Sumo Deadlift')
  })
  it('bench is the competition grip name', () => {
    expect(compVariant('bench', { grip: 'close' })).toBe('Bench Press (Competition Grip)')
  })
})

describe('emphasis', () => {
  it('low-bar squat biases hamstrings over quads', () => {
    const e = emphasis('squat', { bar: 'low' })
    expect(e.hamstrings).toBeGreaterThan(1)
    expect(e.quads).toBeLessThan(1)
  })
  it('sumo deadlift biases quads', () => {
    expect(emphasis('deadlift', { stance: 'sumo' }).quads).toBeGreaterThan(1)
  })
  it('close-grip bench biases triceps', () => {
    expect(emphasis('bench', { grip: 'close' }).triceps).toBeGreaterThan(1)
  })
})
