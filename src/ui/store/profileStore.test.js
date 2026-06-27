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

describe('v3 quality fields', () => {
  beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })
  it('defaults include qualities + adaptive model, no goal', () => {
    const p = useProfileStore.getState().profile
    expect(p.qualities.strength).toBe(0.5)
    expect(p.periodizationModel).toBe('adaptive')
    expect(p).not.toHaveProperty('goal')
  })
  it('setQuality / applyPreset / setPeriodizationModel', () => {
    const s = useProfileStore.getState()
    s.setQuality('power', 0.3)
    expect(useProfileStore.getState().profile.qualities.power).toBe(0.3)
    s.applyPreset('powerbuilding')
    expect(useProfileStore.getState().profile.qualities.hypertrophy).toBe(0.45)
    s.setPeriodizationModel('block')
    expect(useProfileStore.getState().profile.periodizationModel).toBe('block')
  })
})

describe('priorityLift', () => {
  beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })
  it('defaults to null and is settable', () => {
    expect(useProfileStore.getState().profile.priorityLift).toBeNull()
    useProfileStore.getState().setPriorityLift('bench')
    expect(useProfileStore.getState().profile.priorityLift).toBe('bench')
  })
})

describe('v3 mesocycle + variation-control fields', () => {
  beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })
  it('defaults include mesoWeeks: 4, deloadEnabled: true, excludedExercises: [], variationOverride nulls', () => {
    const p = useProfileStore.getState().profile
    expect(p.mesoWeeks).toBe(4)
    expect(p.deloadEnabled).toBe(true)
    expect(p.excludedExercises).toEqual([])
    expect(p.variationOverride).toEqual({ squat: null, bench: null, deadlift: null })
  })
  it('toggleExcludedExercise adds then removes an exercise', () => {
    const { toggleExcludedExercise } = useProfileStore.getState()
    toggleExcludedExercise('Tempo Squat')
    expect(useProfileStore.getState().profile.excludedExercises).toContain('Tempo Squat')
    toggleExcludedExercise('Tempo Squat')
    expect(useProfileStore.getState().profile.excludedExercises).not.toContain('Tempo Squat')
  })
  it('setVariationOverride sets the lift variation', () => {
    useProfileStore.getState().setVariationOverride('squat', 'box squat')
    expect(useProfileStore.getState().profile.variationOverride.squat).toBe('box squat')
    useProfileStore.getState().setVariationOverride('squat', null)
    expect(useProfileStore.getState().profile.variationOverride.squat).toBeNull()
  })
  it('cueNeed defaults to nulls and setCueNeed updates it', () => {
    expect(useProfileStore.getState().profile.cueNeed).toEqual({ squat: null, bench: null, deadlift: null })
    useProfileStore.getState().setCueNeed('deadlift', 'legDrive')
    expect(useProfileStore.getState().profile.cueNeed.deadlift).toBe('legDrive')
  })
  it('units default kg and setUnits switches', () => {
    expect(useProfileStore.getState().profile.units).toBe('kg')
    useProfileStore.getState().setUnits('lbs')
    expect(useProfileStore.getState().profile.units).toBe('lbs')
  })
  it('rehydrates missing v3 fields from defaults (merge test)', async () => {
    localStorage.clear()
    const old = {
      state: {
        profile: {
          lifts: { squat: { oneRM: 100 }, bench: { oneRM: 80 }, deadlift: { oneRM: 120 } },
          years: 3, daysPerWeek: 4, fatigue: 2,
          equipment: ['barbell'],
          style: { squat: { bar: 'low', stance: 'medium' }, bench: { grip: 'medium' }, deadlift: { stance: 'conventional' } },
          stickingPoint: { squat: 'none', bench: 'none', deadlift: 'none' },
          regionStatus: { lowerBack: 0, knee: 0, shoulder: 0, elbow: 0, wrist: 0, hip: 0, hamstring: 0, pec: 0, ankle: 0, bicepsTendon: 0 },
          qualities: { power: 0, strength: 0.5, hypertrophy: 0.4, endurance: 0.1 },
          periodizationModel: 'adaptive',
        },
        plan: null,
      },
      version: 0,
    }
    localStorage.setItem('powerlifting-profile', JSON.stringify(old))
    await useProfileStore.persist.rehydrate()
    const p = useProfileStore.getState().profile
    // v3 fields restored from defaults
    expect(p.mesoWeeks).toBe(4)
    expect(p.deloadEnabled).toBe(true)
    expect(p.excludedExercises).toEqual([])
    expect(p.variationOverride).toEqual({ squat: null, bench: null, deadlift: null })
    // persisted user data preserved
    expect(p.lifts.squat.oneRM).toBe(100)
    expect(p.years).toBe(3)
  })
})

describe('checkinLog', () => {
  beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })
  it('defaults to empty array', () => {
    expect(useProfileStore.getState().checkinLog).toEqual([])
  })
  it('logCheckin appends an entry', () => {
    const entry = { week: 1, day: 1, readiness: 0.5 }
    useProfileStore.getState().logCheckin(entry)
    const state = useProfileStore.getState()
    expect(state.checkinLog).toHaveLength(1)
    expect(state.checkinLog[0]).toEqual(entry)
  })
  it('clearCheckinLog empties the array', () => {
    useProfileStore.getState().logCheckin({ week: 1, day: 1, readiness: 0.5 })
    expect(useProfileStore.getState().checkinLog).toHaveLength(1)
    useProfileStore.getState().clearCheckinLog()
    expect(useProfileStore.getState().checkinLog).toEqual([])
  })
  it('reset clears checkinLog', () => {
    useProfileStore.getState().logCheckin({ week: 1, day: 1, readiness: 0.5 })
    useProfileStore.getState().reset()
    expect(useProfileStore.getState().checkinLog).toEqual([])
  })
  it('rehydrates missing checkinLog from old persisted state', async () => {
    localStorage.clear()
    const old = {
      state: {
        profile: {
          lifts: { squat: { oneRM: 100 }, bench: { oneRM: 80 }, deadlift: { oneRM: 120 } },
          years: 3, daysPerWeek: 4, fatigue: 2,
        },
        plan: null,
      },
      version: 0,
    }
    localStorage.setItem('powerlifting-profile', JSON.stringify(old))
    await useProfileStore.persist.rehydrate()
    expect(useProfileStore.getState().checkinLog).toEqual([])
  })
})

describe('stickingCause (spec §4.1 case 11)', () => {
  beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

  it('defaults stickingCause to nulls for all lifts', () => {
    expect(useProfileStore.getState().profile.stickingCause).toEqual({ squat: null, bench: null, deadlift: null })
  })

  it('setStickingCause updates the cause for a lift', () => {
    useProfileStore.getState().setStickingCause('squat', 'quads')
    expect(useProfileStore.getState().profile.stickingCause.squat).toBe('quads')
  })

  it('setStickingPoint resets a now-invalid cause to null', () => {
    // Set position to bottom (valid causes: quads, hip for squat)
    useProfileStore.getState().setStickingPoint('squat', 'bottom')
    useProfileStore.getState().setStickingCause('squat', 'quads')
    expect(useProfileStore.getState().profile.stickingCause.squat).toBe('quads')

    // Change to lockout (valid causes: hip, back — quads is now invalid)
    useProfileStore.getState().setStickingPoint('squat', 'lockout')
    expect(useProfileStore.getState().profile.stickingCause.squat).toBeNull()
  })

  it('setStickingPoint keeps a still-valid cause when position changes', () => {
    // bottom → ['quads','hip'], midrange → ['quads','hip','back']
    useProfileStore.getState().setStickingPoint('squat', 'bottom')
    useProfileStore.getState().setStickingCause('squat', 'hip')
    // hip is still valid in midrange
    useProfileStore.getState().setStickingPoint('squat', 'midrange')
    expect(useProfileStore.getState().profile.stickingCause.squat).toBe('hip')
  })

  it('setStickingPoint to none resets cause (no valid causes for none)', () => {
    useProfileStore.getState().setStickingPoint('bench', 'lockout')
    useProfileStore.getState().setStickingCause('bench', 'triceps')
    useProfileStore.getState().setStickingPoint('bench', 'none')
    expect(useProfileStore.getState().profile.stickingCause.bench).toBeNull()
  })

  it('merge injects stickingCause default into an old profile lacking it', async () => {
    localStorage.clear()
    const old = {
      state: {
        profile: {
          lifts: { squat: { oneRM: 100 }, bench: { oneRM: 80 }, deadlift: { oneRM: 120 } },
          years: 3, daysPerWeek: 4, fatigue: 2,
          stickingPoint: { squat: 'bottom', bench: 'none', deadlift: 'none' },
          // stickingCause intentionally absent (old profile)
        },
        plan: null,
      },
      version: 0,
    }
    localStorage.setItem('powerlifting-profile', JSON.stringify(old))
    await useProfileStore.persist.rehydrate()
    const p = useProfileStore.getState().profile
    // stickingCause should be filled with defaults (all null)
    expect(p.stickingCause).toEqual({ squat: null, bench: null, deadlift: null })
    // existing user data preserved
    expect(p.stickingPoint.squat).toBe('bottom')
    expect(p.lifts.squat.oneRM).toBe(100)
  })
})
