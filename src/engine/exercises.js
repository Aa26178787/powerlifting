import db from '../data/exercises.json' with { type: 'json' }

export const MAIN_LIFTS = ['squat', 'bench', 'deadlift']

export function all() {
  return db.exercises
}

export function byName(name) {
  return db.exercises.find((e) => e.name === name)
}

export function stressesRegion(ex, region) {
  return ex.stress.includes(region)
}

export function query({ category, targetLift, stickingPoint, primaryMuscle, equipmentAvailable, excludeAdvanced } = {}) {
  const have = equipmentAvailable ? new Set(equipmentAvailable) : null
  return db.exercises.filter((e) => {
    if (category && e.category !== category) return false
    if (targetLift && e.targetLift !== targetLift) return false
    if (stickingPoint && e.stickingPoint !== stickingPoint) return false
    if (primaryMuscle && e.primaryMuscle !== primaryMuscle) return false
    if (excludeAdvanced && e.advanced) return false
    if (have && !e.equipment.every((x) => have.has(x))) return false
    return true
  })
}
