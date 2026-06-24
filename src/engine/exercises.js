import db from '../data/exercises.json' with { type: 'json' }

export const MAIN_LIFTS = ['squat', 'bench', 'deadlift']

export function substitute(lift, injuries = []) {
  for (const injury of injuries) {
    const map = db.substitutions[injury]
    if (map && map[lift]) return map[lift]
  }
  return lift
}

export function filterByEquipment(names, equipment = []) {
  const have = new Set(equipment)
  return names.filter((name) => {
    const ex = db.exercises[name]
    if (!ex) return false
    return ex.equipment.every((e) => have.has(e))
  })
}

export function accessoriesFor(lift) {
  return db.accessories[lift] ?? []
}
