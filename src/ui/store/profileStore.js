import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { presetBlend } from '../../engine/quality.js'

export const DEFAULT_PROFILE = {
  lifts: {
    squat: { oneRM: null },
    bench: { oneRM: null },
    deadlift: { oneRM: null },
  },
  years: 1,
  daysPerWeek: 4,
  fatigue: 2,
  competition: { on: false, date: '' },
  age: null,
  bodyweight: null,
  sex: '',
  weakLift: '',
  sessionTimeLimit: null,
  equipment: ['barbell', 'rack', 'bench'],
  style: { squat: { bar: 'low', stance: 'medium' }, bench: { grip: 'medium' }, deadlift: { stance: 'conventional' } },
  stickingPoint: { squat: 'none', bench: 'none', deadlift: 'none' },
  regionStatus: { lowerBack: 0, knee: 0, shoulder: 0, elbow: 0, wrist: 0, hip: 0, hamstring: 0, pec: 0, ankle: 0, bicepsTendon: 0 },
  qualities: { power: 0, strength: 0.5, hypertrophy: 0.4, endurance: 0.1 },
  periodizationModel: 'adaptive',
  priorityLift: null,
  mesoWeeks: 4,
  deloadEnabled: true,
  excludedExercises: [],
  variationOverride: { squat: null, bench: null, deadlift: null },
  cueNeed: { squat: null, bench: null, deadlift: null },
}

function hasUsableLift(liftInput) {
  if (!liftInput) return false
  if (typeof liftInput.oneRM === 'number' && liftInput.oneRM > 0) return true
  return (
    typeof liftInput.weight === 'number' && liftInput.weight > 0 &&
    typeof liftInput.reps === 'number' && liftInput.reps > 0 &&
    typeof liftInput.rpe === 'number'
  )
}

export function selectIsValid(profile) {
  const lifts = profile.lifts
  const liftsOk = ['squat', 'bench', 'deadlift'].every((l) => hasUsableLift(lifts[l]))
  return liftsOk && typeof profile.daysPerWeek === 'number' && typeof profile.years === 'number'
}

export const useProfileStore = create(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      plan: null,
      checkinLog: [],
      setField: (path, value) =>
        set((s) => ({ profile: { ...s.profile, [path]: value } })),
      setLift: (lift, liftInput) =>
        set((s) => ({ profile: { ...s.profile, lifts: { ...s.profile.lifts, [lift]: liftInput } } })),
      setStyle: (lift, patch) =>
        set((s) => ({ profile: { ...s.profile, style: { ...s.profile.style, [lift]: { ...s.profile.style[lift], ...patch } } } })),
      setStickingPoint: (lift, value) =>
        set((s) => ({ profile: { ...s.profile, stickingPoint: { ...s.profile.stickingPoint, [lift]: value } } })),
      setRegionStatus: (region, value) =>
        set((s) => ({ profile: { ...s.profile, regionStatus: { ...s.profile.regionStatus, [region]: value } } })),
      setQuality: (q, value) =>
        set((s) => ({ profile: { ...s.profile, qualities: { ...s.profile.qualities, [q]: value } } })),
      applyPreset: (key) =>
        set((s) => { const b = presetBlend(key); return b ? { profile: { ...s.profile, qualities: b } } : {} }),
      setPeriodizationModel: (value) =>
        set((s) => ({ profile: { ...s.profile, periodizationModel: value } })),
      setPriorityLift: (value) =>
        set((s) => ({ profile: { ...s.profile, priorityLift: value } })),
      toggleEquipment: (name) =>
        set((s) => {
          const has = s.profile.equipment.includes(name)
          const equipment = has ? s.profile.equipment.filter((e) => e !== name) : [...s.profile.equipment, name]
          return { profile: { ...s.profile, equipment } }
        }),
      toggleExcludedExercise: (name) =>
        set((s) => {
          const has = s.profile.excludedExercises.includes(name)
          const excludedExercises = has ? s.profile.excludedExercises.filter((n) => n !== name) : [...s.profile.excludedExercises, name]
          return { profile: { ...s.profile, excludedExercises } }
        }),
      setVariationOverride: (lift, name) =>
        set((s) => ({ profile: { ...s.profile, variationOverride: { ...s.profile.variationOverride, [lift]: name } } })),
      setCueNeed: (lift, key) =>
        set((s) => ({ profile: { ...s.profile, cueNeed: { ...s.profile.cueNeed, [lift]: key } } })),
      logCheckin: (entry) =>
        set((s) => {
          // One readiness per session: upsert by {week,day} so re-applying a
          // session updates its entry rather than appending a duplicate (which
          // would otherwise skew the overreaching trend).
          const rest = s.checkinLog.filter((e) => !(e.week === entry.week && e.day === entry.day))
          return { checkinLog: [...rest, entry] }
        }),
      clearCheckinLog: () =>
        set({ checkinLog: [] }),
      reset: () => set({ profile: DEFAULT_PROFILE, plan: null, checkinLog: [] }),
    }),
    {
      name: 'powerlifting-profile',
      // No `version` bump on purpose: a version mismatch without a migrate makes
      // zustand DISCARD the persisted state (losing the user's saved profile).
      // Instead we keep the stored data and deep-merge it onto the current
      // defaults so a profile saved by an older app version (which lacks
      // style/stickingPoint/regionStatus) can't leave those objects undefined —
      // that previously crashed the form (white screen) on rehydrate.
      merge: (persisted, current) => {
        const p = (persisted && persisted.profile) || {}
        return {
          ...current,
          ...persisted,
          profile: {
            ...current.profile,
            ...p,
            lifts: { ...current.profile.lifts, ...(p.lifts || {}) },
            competition: { ...current.profile.competition, ...(p.competition || {}) },
            style: { ...current.profile.style, ...(p.style || {}) },
            stickingPoint: { ...current.profile.stickingPoint, ...(p.stickingPoint || {}) },
            regionStatus: { ...current.profile.regionStatus, ...(p.regionStatus || {}) },
            qualities: { ...current.profile.qualities, ...(p.qualities || {}) },
            periodizationModel: p.periodizationModel ?? current.profile.periodizationModel,
            priorityLift: p.priorityLift ?? current.profile.priorityLift,
            mesoWeeks: p.mesoWeeks ?? current.profile.mesoWeeks,
            deloadEnabled: p.deloadEnabled ?? current.profile.deloadEnabled,
            excludedExercises: p.excludedExercises ?? current.profile.excludedExercises,
            variationOverride: { ...current.profile.variationOverride, ...(p.variationOverride || {}) },
            cueNeed: { ...current.profile.cueNeed, ...(p.cueNeed || {}) },
          },
          checkinLog: persisted?.checkinLog ?? [],
        }
      },
    }
  )
)
