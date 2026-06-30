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

// ── volumeOverride actions (§5.3) ─────────────────────────────────────────────
describe('volumeOverride default', () => {
  beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

  it('DEFAULT_PROFILE includes volumeOverride with disabled main + accessory and null setsPerSession', () => {
    expect(DEFAULT_PROFILE.volumeOverride).toEqual({
      main: {
        enabled: false,
        mode: 'rampFromFloor',
        setsPerSession: { squat: null, bench: null, deadlift: null },
      },
      accessory: { enabled: false, setsPerSession: null },
    })
  })
})

describe('setVolumeOverrideEnabled', () => {
  beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

  it('enables main volume override', () => {
    useProfileStore.getState().setVolumeOverrideEnabled('main', true)
    expect(useProfileStore.getState().profile.volumeOverride.main.enabled).toBe(true)
  })
  it('enables accessory volume override', () => {
    useProfileStore.getState().setVolumeOverrideEnabled('accessory', true)
    expect(useProfileStore.getState().profile.volumeOverride.accessory.enabled).toBe(true)
  })
  it('disables main volume override', () => {
    useProfileStore.getState().setVolumeOverrideEnabled('main', true)
    useProfileStore.getState().setVolumeOverrideEnabled('main', false)
    expect(useProfileStore.getState().profile.volumeOverride.main.enabled).toBe(false)
  })
})

describe('setMainVolumeMode', () => {
  beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

  it('sets mode to fixed', () => {
    useProfileStore.getState().setMainVolumeMode('fixed')
    expect(useProfileStore.getState().profile.volumeOverride.main.mode).toBe('fixed')
  })
  it('sets mode back to rampFromFloor', () => {
    useProfileStore.getState().setMainVolumeMode('fixed')
    useProfileStore.getState().setMainVolumeMode('rampFromFloor')
    expect(useProfileStore.getState().profile.volumeOverride.main.mode).toBe('rampFromFloor')
  })
})

describe('setMainSetsPerSession', () => {
  beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

  it('sets squat setsPerSession to a value', () => {
    useProfileStore.getState().setMainSetsPerSession('squat', 5)
    expect(useProfileStore.getState().profile.volumeOverride.main.setsPerSession.squat).toBe(5)
  })
  it('clamps value to max 12', () => {
    useProfileStore.getState().setMainSetsPerSession('bench', 15)
    expect(useProfileStore.getState().profile.volumeOverride.main.setsPerSession.bench).toBe(12)
  })
  it('clamps value to min 1', () => {
    useProfileStore.getState().setMainSetsPerSession('deadlift', 0)
    expect(useProfileStore.getState().profile.volumeOverride.main.setsPerSession.deadlift).toBe(1)
  })
  it('accepts null (clears the override)', () => {
    useProfileStore.getState().setMainSetsPerSession('squat', 5)
    useProfileStore.getState().setMainSetsPerSession('squat', null)
    expect(useProfileStore.getState().profile.volumeOverride.main.setsPerSession.squat).toBeNull()
  })
  it('only updates the targeted lift', () => {
    useProfileStore.getState().setMainSetsPerSession('squat', 4)
    const sps = useProfileStore.getState().profile.volumeOverride.main.setsPerSession
    expect(sps.bench).toBeNull()
    expect(sps.deadlift).toBeNull()
  })
})

describe('setAccessorySetsPerSession', () => {
  beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

  it('sets accessory setsPerSession', () => {
    useProfileStore.getState().setAccessorySetsPerSession(4)
    expect(useProfileStore.getState().profile.volumeOverride.accessory.setsPerSession).toBe(4)
  })
  it('clamps value to max 8', () => {
    useProfileStore.getState().setAccessorySetsPerSession(10)
    expect(useProfileStore.getState().profile.volumeOverride.accessory.setsPerSession).toBe(8)
  })
  it('clamps value to min 0', () => {
    useProfileStore.getState().setAccessorySetsPerSession(-1)
    expect(useProfileStore.getState().profile.volumeOverride.accessory.setsPerSession).toBe(0)
  })
  it('accepts null', () => {
    useProfileStore.getState().setAccessorySetsPerSession(4)
    useProfileStore.getState().setAccessorySetsPerSession(null)
    expect(useProfileStore.getState().profile.volumeOverride.accessory.setsPerSession).toBeNull()
  })
})

describe('applyVolumeRecommendation', () => {
  beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

  it('fills all three lifts setsPerSession with non-null values', () => {
    useProfileStore.getState().applyVolumeRecommendation()
    const sps = useProfileStore.getState().profile.volumeOverride.main.setsPerSession
    expect(sps.squat).not.toBeNull()
    expect(sps.bench).not.toBeNull()
    expect(sps.deadlift).not.toBeNull()
  })
  it('sets main.enabled = true', () => {
    useProfileStore.getState().applyVolumeRecommendation()
    expect(useProfileStore.getState().profile.volumeOverride.main.enabled).toBe(true)
  })
  it('sets accessory.enabled = true and fills setsPerSession', () => {
    useProfileStore.getState().applyVolumeRecommendation()
    const acc = useProfileStore.getState().profile.volumeOverride.accessory
    expect(acc.enabled).toBe(true)
    expect(acc.setsPerSession).not.toBeNull()
  })
  it('sets mode to rampFromFloor', () => {
    useProfileStore.getState().setMainVolumeMode('fixed')
    useProfileStore.getState().applyVolumeRecommendation()
    expect(useProfileStore.getState().profile.volumeOverride.main.mode).toBe('rampFromFloor')
  })
})

describe('clearVolumeOverride', () => {
  beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

  it('resets all setsPerSession to null and enabled to false', () => {
    useProfileStore.getState().applyVolumeRecommendation()
    useProfileStore.getState().clearVolumeOverride()
    const ov = useProfileStore.getState().profile.volumeOverride
    expect(ov.main.enabled).toBe(false)
    expect(ov.main.mode).toBe('rampFromFloor')
    expect(ov.main.setsPerSession).toEqual({ squat: null, bench: null, deadlift: null })
    expect(ov.accessory.enabled).toBe(false)
    expect(ov.accessory.setsPerSession).toBeNull()
  })
})

describe('merge injects volumeOverride default into old profile lacking it', () => {
  beforeEach(() => { localStorage.clear() })

  it('old profile without volumeOverride gets defaults merged in without crash', async () => {
    const old = {
      state: {
        profile: {
          lifts: { squat: { oneRM: 100 }, bench: { oneRM: 80 }, deadlift: { oneRM: 120 } },
          years: 3, daysPerWeek: 4, fatigue: 2,
          // volumeOverride intentionally absent (old persisted profile)
        },
        plan: null,
      },
      version: 0,
    }
    localStorage.setItem('powerlifting-profile', JSON.stringify(old))
    await useProfileStore.persist.rehydrate()
    const p = useProfileStore.getState().profile
    expect(p.volumeOverride).toBeDefined()
    expect(p.volumeOverride.main.enabled).toBe(false)
    expect(p.volumeOverride.main.mode).toBe('rampFromFloor')
    expect(p.volumeOverride.main.setsPerSession).toEqual({ squat: null, bench: null, deadlift: null })
    expect(p.volumeOverride.accessory.enabled).toBe(false)
    expect(p.volumeOverride.accessory.setsPerSession).toBeNull()
    // original user data preserved
    expect(p.lifts.squat.oneRM).toBe(100)
    expect(p.years).toBe(3)
  })

  it('partial volumeOverride in old profile is deep-merged (setsPerSession preserved)', async () => {
    const old = {
      state: {
        profile: {
          lifts: { squat: { oneRM: 100 }, bench: { oneRM: 80 }, deadlift: { oneRM: 120 } },
          years: 2, daysPerWeek: 4, fatigue: 2,
          volumeOverride: {
            main: { enabled: true, mode: 'fixed', setsPerSession: { squat: 5, bench: null, deadlift: null } },
            // accessory absent
          },
        },
        plan: null,
      },
      version: 0,
    }
    localStorage.setItem('powerlifting-profile', JSON.stringify(old))
    await useProfileStore.persist.rehydrate()
    const p = useProfileStore.getState().profile
    expect(p.volumeOverride.main.enabled).toBe(true)
    expect(p.volumeOverride.main.mode).toBe('fixed')
    expect(p.volumeOverride.main.setsPerSession.squat).toBe(5)
    expect(p.volumeOverride.accessory.enabled).toBe(false)
    expect(p.volumeOverride.accessory.setsPerSession).toBeNull()
  })
})

// ── overload field (v5 / Spec 4 Fix 2) ───────────────────────────────────────
describe('overload field', () => {
  beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

  it('DEFAULT_PROFILE includes overload with disabled defaults', () => {
    expect(DEFAULT_PROFILE.overload).toEqual({
      enabled: false, lifts: [], targetPct: 4, overreachWeeks: 3,
      preset: null, readiness: null, lastEndWeek: null,
    })
  })

  it('setOverload merges a partial into profile.overload', () => {
    useProfileStore.getState().setOverload({ enabled: true, lifts: ['squat'] })
    const { overload } = useProfileStore.getState().profile
    expect(overload.enabled).toBe(true)
    expect(overload.lifts).toEqual(['squat'])
    // non-updated fields preserved
    expect(overload.targetPct).toBe(4)
    expect(overload.overreachWeeks).toBe(3)
  })

  it('rehydrates missing overload from old persisted profile (merge deep-fill)', async () => {
    localStorage.clear()
    const old = {
      state: {
        profile: {
          lifts: { squat: { oneRM: 100 }, bench: { oneRM: 80 }, deadlift: { oneRM: 120 } },
          years: 3, daysPerWeek: 4, fatigue: 2,
          // overload intentionally absent (old persisted profile)
        },
        plan: null,
      },
      version: 0,
    }
    localStorage.setItem('powerlifting-profile', JSON.stringify(old))
    await useProfileStore.persist.rehydrate()
    const p = useProfileStore.getState().profile
    expect(p.overload).toEqual({
      enabled: false, lifts: [], targetPct: 4, overreachWeeks: 3,
      preset: null, readiness: null, lastEndWeek: null,
    })
    // user data preserved
    expect(p.lifts.squat.oneRM).toBe(100)
    expect(p.years).toBe(3)
  })
})

// ── liftLog (mirrors checkinLog pattern) ─────────────────────────────────────
describe('liftLog', () => {
  beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

  it('defaults to empty array', () => {
    expect(useProfileStore.getState().liftLog).toEqual([])
  })

  it('logLift appends an entry with a ts timestamp', () => {
    const entry = { lift: 'squat', week: 1, day: 1, weight: 100, reps: 1, rpe: 10, flag: null }
    useProfileStore.getState().logLift(entry)
    const state = useProfileStore.getState()
    expect(state.liftLog).toHaveLength(1)
    expect(state.liftLog[0]).toMatchObject(entry)
    expect(typeof state.liftLog[0].ts).toBe('number')
  })

  it('logLift upserts by {lift,week,day} — duplicate key replaced, not appended', () => {
    const e1 = { lift: 'squat', week: 1, day: 1, weight: 100, reps: 1, rpe: 10, flag: null }
    const e2 = { lift: 'squat', week: 1, day: 1, weight: 105, reps: 1, rpe: 9.5, flag: null }
    useProfileStore.getState().logLift(e1)
    useProfileStore.getState().logLift(e2)
    const state = useProfileStore.getState()
    expect(state.liftLog).toHaveLength(1) // upsert, not append
    expect(state.liftLog[0].weight).toBe(105) // latest value wins
  })

  it('logLift with different lift/week/day → separate entries', () => {
    useProfileStore.getState().logLift({ lift: 'squat', week: 1, day: 1, weight: 100, reps: 1, rpe: 10, flag: null })
    useProfileStore.getState().logLift({ lift: 'bench', week: 1, day: 1, weight: 80,  reps: 1, rpe: 10, flag: null })
    expect(useProfileStore.getState().liftLog).toHaveLength(2)
  })

  it('clearLiftLog empties the array', () => {
    useProfileStore.getState().logLift({ lift: 'squat', week: 1, day: 1, weight: 100, reps: 1, rpe: 10, flag: null })
    expect(useProfileStore.getState().liftLog).toHaveLength(1)
    useProfileStore.getState().clearLiftLog()
    expect(useProfileStore.getState().liftLog).toEqual([])
  })

  it('reset clears liftLog', () => {
    useProfileStore.getState().logLift({ lift: 'squat', week: 1, day: 1, weight: 100, reps: 1, rpe: 10, flag: null })
    useProfileStore.getState().reset()
    expect(useProfileStore.getState().liftLog).toEqual([])
  })

  it('rehydrates missing liftLog from old persisted state → defaults to []', async () => {
    localStorage.clear()
    const old = {
      state: {
        profile: {
          lifts: { squat: { oneRM: 100 }, bench: { oneRM: 80 }, deadlift: { oneRM: 120 } },
          years: 3, daysPerWeek: 4, fatigue: 2,
          // liftLog intentionally absent (old persisted profile)
        },
        plan: null,
      },
      version: 0,
    }
    localStorage.setItem('powerlifting-profile', JSON.stringify(old))
    await useProfileStore.persist.rehydrate()
    expect(useProfileStore.getState().liftLog).toEqual([])
  })
})

// ── Feature 2 (backoff) + Feature 3 (accessory sets/reps edit) ───────────────
describe('backoffRpeDrop + accessorySchemeOverrides', () => {
  beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

  it('DEFAULT_PROFILE has byte-identity-safe defaults', () => {
    expect(DEFAULT_PROFILE.backoffRpeDrop).toBe(0)
    expect(DEFAULT_PROFILE.accessorySchemeOverrides).toEqual({})
  })
  it('setBackoffRpeDrop clamps to [0,2.5] and snaps to 0.5', () => {
    const s = () => useProfileStore.getState()
    s().setBackoffRpeDrop(-1);  expect(s().profile.backoffRpeDrop).toBe(0)
    s().setBackoffRpeDrop(9);   expect(s().profile.backoffRpeDrop).toBe(2.5)
    s().setBackoffRpeDrop(1.3); expect(s().profile.backoffRpeDrop).toBe(1.5)
  })
  it('setAccessoryScheme clamps sets[1,8]/reps[3,30]/rpe[5,10]; clearAccessoryScheme removes', () => {
    const s = () => useProfileStore.getState()
    s().setAccessoryScheme('Barbell Curl', { sets: 99, reps: 2, rpe: 11 })
    expect(s().profile.accessorySchemeOverrides['Barbell Curl']).toEqual({ sets: 8, reps: 3, rpe: 10 })
    s().setAccessoryScheme('Barbell Curl', { sets: 0, reps: 40 })   // rpe omitted in patch → kept from merge then re-clamped
    expect(s().profile.accessorySchemeOverrides['Barbell Curl'].sets).toBe(1)
    expect(s().profile.accessorySchemeOverrides['Barbell Curl'].reps).toBe(30)
    s().clearAccessoryScheme('Barbell Curl')
    expect(s().profile.accessorySchemeOverrides['Barbell Curl']).toBeUndefined()
  })
  it('rehydrates a pre-feature profile → new fields default safely', async () => {
    localStorage.clear()
    const old = {
      state: { profile: { lifts: { squat: { oneRM: 100 }, bench: { oneRM: 80 }, deadlift: { oneRM: 120 } }, years: 3, daysPerWeek: 4, fatigue: 2 }, plan: null },
      version: 0,
    }
    localStorage.setItem('powerlifting-profile', JSON.stringify(old))
    await useProfileStore.persist.rehydrate()
    const p = useProfileStore.getState().profile
    expect(p.backoffRpeDrop).toBe(0)
    expect(p.accessorySchemeOverrides).toEqual({})
  })
})

// ── Feature 5 (street lifting) ───────────────────────────────────────────────
describe('streetLifting', () => {
  beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

  it('DEFAULT_PROFILE has a disabled street block with k/frequency/lift sub-objects', () => {
    const sl = DEFAULT_PROFILE.streetLifting
    expect(sl.enabled).toBe(false)
    expect(sl.placement).toBe('integrated')   // default: inside the routine
    expect(sl.k).toEqual({ dip: 0.95, pullup: 0.90 })
    expect(sl.dip).toHaveProperty('added')
    expect(sl.pullup).toHaveProperty('grip')
  })
  it('setters update enabled / lift inputs / k (clamped) / frequency (clamped)', () => {
    const s = () => useProfileStore.getState()
    s().setStreetEnabled(true);                 expect(s().profile.streetLifting.enabled).toBe(true)
    s().setStreetLift('dip', { added: 40, reps: 1, rpe: 10 })
    expect(s().profile.streetLifting.dip).toEqual({ added: 40, reps: 1, rpe: 10 })
    s().setStreetK('pullup', 9);                expect(s().profile.streetLifting.k.pullup).toBe(1.2)   // clamp ≤1.2
    s().setStreetFrequency('dip', 9);           expect(s().profile.streetLifting.frequency.dip).toBe(4) // clamp ≤4
  })
  it('rehydrates a pre-feature profile → nested street defaults filled, no crash', async () => {
    localStorage.clear()
    const old = {
      state: { profile: { lifts: { squat: { oneRM: 100 }, bench: { oneRM: 80 }, deadlift: { oneRM: 120 } }, years: 3, daysPerWeek: 4, fatigue: 2 }, plan: null },
      version: 0,
    }
    localStorage.setItem('powerlifting-profile', JSON.stringify(old))
    await useProfileStore.persist.rehydrate()
    const sl = useProfileStore.getState().profile.streetLifting
    expect(sl.enabled).toBe(false)
    expect(sl.k.dip).toBe(0.95)
    expect(sl.pullup.grip).toBe('pronated')
  })
})
