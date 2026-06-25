import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const DEFAULT_PROFILE = {
  lifts: {
    squat: { oneRM: null },
    bench: { oneRM: null },
    deadlift: { oneRM: null },
  },
  years: 1,
  daysPerWeek: 4,
  goal: 'strength',
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
  return liftsOk && typeof profile.daysPerWeek === 'number' && !!profile.goal && typeof profile.years === 'number'
}

export const useProfileStore = create(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      plan: null,
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
      toggleEquipment: (name) =>
        set((s) => {
          const has = s.profile.equipment.includes(name)
          const equipment = has ? s.profile.equipment.filter((e) => e !== name) : [...s.profile.equipment, name]
          return { profile: { ...s.profile, equipment } }
        }),
      reset: () => set({ profile: DEFAULT_PROFILE, plan: null }),
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
          },
        }
      },
    }
  )
)
