// @vitest-environment jsdom
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

describe('toggleEquipment', () => {
  it('adds then removes equipment', () => {
    const { toggleEquipment } = useProfileStore.getState()
    toggleEquipment('dumbbell')
    expect(useProfileStore.getState().profile.equipment).toContain('dumbbell')
    toggleEquipment('dumbbell')
    expect(useProfileStore.getState().profile.equipment).not.toContain('dumbbell')
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

describe('v2 profile fields', () => {
  beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })
  it('defaults include style, stickingPoint, regionStatus', () => {
    const p = useProfileStore.getState().profile
    expect(p.style.squat.bar).toBe('low')
    expect(p.stickingPoint.bench).toBe('none')
    expect(p.regionStatus.lowerBack).toBe(0)
  })
  it('setStyle / setStickingPoint / setRegionStatus update state', () => {
    const s = useProfileStore.getState()
    s.setStyle('deadlift', { stance: 'sumo' })
    s.setStickingPoint('squat', 'bottom')
    s.setRegionStatus('knee', 2)
    const p = useProfileStore.getState().profile
    expect(p.style.deadlift.stance).toBe('sumo')
    expect(p.stickingPoint.squat).toBe('bottom')
    expect(p.regionStatus.knee).toBe(2)
  })
})

describe('rehydration of a pre-v2 persisted profile', () => {
  beforeEach(() => { localStorage.clear() })
  it('fills missing style/stickingPoint/regionStatus from defaults (no crash)', async () => {
    // old app version persisted a profile WITHOUT the v2 fields (had injuries)
    const old = {
      state: {
        profile: {
          lifts: { squat: { oneRM: 100 }, bench: { oneRM: 80 }, deadlift: { oneRM: 120 } },
          years: 3, daysPerWeek: 4, goal: 'strength', fatigue: 2, injuries: ['knee'],
        },
        plan: null,
      },
      version: 0,
    }
    localStorage.setItem('powerlifting-profile', JSON.stringify(old))
    await useProfileStore.persist.rehydrate()
    const p = useProfileStore.getState().profile
    // v2 fields restored from defaults (would have been undefined -> form crash)
    expect(p.style.squat.bar).toBe('low')
    expect(p.stickingPoint.bench).toBe('none')
    expect(p.regionStatus.lowerBack).toBe(0)
    // persisted user data preserved
    expect(p.lifts.squat.oneRM).toBe(100)
    expect(p.years).toBe(3)
  })
})
