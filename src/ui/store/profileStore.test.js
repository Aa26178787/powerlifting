import { describe, it, expect, beforeEach } from 'vitest'
import { useProfileStore, DEFAULT_PROFILE, selectIsValid } from './profileStore.js'

beforeEach(() => {
  useProfileStore.getState().reset()
  localStorage.clear()
})

describe('DEFAULT_PROFILE', () => {
  it('has the three main lifts and core fields', () => {
    expect(DEFAULT_PROFILE.lifts).toHaveProperty('squat')
    expect(DEFAULT_PROFILE.lifts).toHaveProperty('bench')
    expect(DEFAULT_PROFILE.lifts).toHaveProperty('deadlift')
    expect(DEFAULT_PROFILE).toHaveProperty('years')
    expect(DEFAULT_PROFILE).toHaveProperty('daysPerWeek')
    expect(DEFAULT_PROFILE).toHaveProperty('goal')
    expect(DEFAULT_PROFILE).toHaveProperty('fatigue')
  })
})

describe('setField & setLift', () => {
  it('updates a top-level field', () => {
    useProfileStore.getState().setField('daysPerWeek', 5)
    expect(useProfileStore.getState().profile.daysPerWeek).toBe(5)
  })
  it('updates a lift input', () => {
    useProfileStore.getState().setLift('squat', { oneRM: 200 })
    expect(useProfileStore.getState().profile.lifts.squat).toEqual({ oneRM: 200 })
  })
})

describe('toggleInjury & toggleEquipment', () => {
  it('adds then removes an injury', () => {
    const { toggleInjury } = useProfileStore.getState()
    toggleInjury('knee')
    expect(useProfileStore.getState().profile.injuries).toContain('knee')
    toggleInjury('knee')
    expect(useProfileStore.getState().profile.injuries).not.toContain('knee')
  })
})

describe('selectIsValid', () => {
  it('is false for a default (empty 1RM) profile and true once lifts are set', () => {
    expect(selectIsValid(DEFAULT_PROFILE)).toBe(false)
    const p = {
      ...DEFAULT_PROFILE,
      lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
    }
    expect(selectIsValid(p)).toBe(true)
  })
})
