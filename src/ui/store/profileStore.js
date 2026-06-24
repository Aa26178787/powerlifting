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
  injuries: [],
  sessionTimeLimit: null,
  equipment: ['barbell', 'rack', 'bench'],
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
      toggleInjury: (name) =>
        set((s) => {
          const has = s.profile.injuries.includes(name)
          const injuries = has ? s.profile.injuries.filter((i) => i !== name) : [...s.profile.injuries, name]
          return { profile: { ...s.profile, injuries } }
        }),
      toggleEquipment: (name) =>
        set((s) => {
          const has = s.profile.equipment.includes(name)
          const equipment = has ? s.profile.equipment.filter((e) => e !== name) : [...s.profile.equipment, name]
          return { profile: { ...s.profile, equipment } }
        }),
      reset: () => set({ profile: DEFAULT_PROFILE, plan: null }),
    }),
    { name: 'powerlifting-profile' }
  )
)
