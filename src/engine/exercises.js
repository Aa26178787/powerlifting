import db from '../data/exercises.json' with { type: 'json' }

export const MAIN_LIFTS = ['squat', 'bench', 'deadlift']

export function all() {
  return db.exercises
}

export function byName(name) {
  return db.exercises.find((e) => e.name === name)
}

// Every distinct equipment tag in the DB. Used to represent "the athlete has
// all equipment" so the equipment filter never excludes a variation/accessory.
export function allEquipment() {
  const s = new Set()
  for (const e of db.exercises) for (const x of e.equipment) s.add(x)
  return [...s]
}

/**
 * Returns true if every equipment tag on an exercise is satisfiable by the
 * available set. Slash-joined tags (e.g. "db/kb", "barbell/ssb") are treated
 * as OR-alternatives: the tag passes when ANY option is in the have-set.
 */
export function equipmentSatisfies(exEquip, have) {
  if (!have) return true
  const haveSet = have instanceof Set ? have : new Set(have)
  return exEquip.every((tag) => tag.split('/').some((opt) => haveSet.has(opt)))
}

export function query({ category, targetLift, stickingPoint, primaryMuscle, equipmentAvailable, excludeAdvanced } = {}) {
  const have = equipmentAvailable ? new Set(equipmentAvailable) : null
  return db.exercises.filter((e) => {
    if (category && e.category !== category) return false
    if (targetLift && e.targetLift !== targetLift) return false
    if (stickingPoint && e.stickingPoint !== stickingPoint) return false
    if (primaryMuscle && e.primaryMuscle !== primaryMuscle) return false
    if (excludeAdvanced && e.advanced) return false
    if (have && !equipmentSatisfies(e.equipment, have)) return false
    return true
  })
}
