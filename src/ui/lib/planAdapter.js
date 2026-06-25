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
    // Assume the athlete has all equipment; exclusion is now per-exercise.
    equipment: allEquipment(),
    sessionTimeLimit: form.sessionTimeLimit,
    competition: form.competition,
    priorityLift: form.priorityLift,
    mesoWeeks: form.mesoWeeks,
    deloadEnabled: form.deloadEnabled,
    variationOverride: form.variationOverride ?? {},
    excludedExercises: form.excludedExercises ?? [],
  }
}

export function buildPlan(form) {
  const raw = generate(toEngineProfile(form))
  return { template: raw.template, model: raw.model, weeks: raw.weeks }
}
