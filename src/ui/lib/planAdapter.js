import { generate } from '../../engine/generate.js'
import { allEquipment } from '../../engine/exercises.js'

export function toEngineProfile(form) {
  return {
    lifts: form.lifts,
    years: form.years,
    daysPerWeek: form.daysPerWeek,
    fatigue: form.fatigue,
    qualities: form.qualities,
    periodizationModel: form.periodizationModel,
    style: form.style,
    stickingPoint: form.stickingPoint,
    regionStatus: form.regionStatus,
    // Equipment is no longer a user input — assume the athlete has everything,
    // so the variation/accessory filter never excludes a movement.
    equipment: allEquipment(),
    sessionTimeLimit: form.sessionTimeLimit,
    competition: form.competition,
    priorityLift: form.priorityLift,
  }
}

export function buildPlan(form) {
  const raw = generate(toEngineProfile(form))
  return { template: raw.template, model: raw.model, weeks: raw.weeks }
}
