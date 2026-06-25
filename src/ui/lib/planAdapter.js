import { generate } from '../../engine/generate.js'

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
    equipment: form.equipment,
    sessionTimeLimit: form.sessionTimeLimit,
    competition: form.competition,
  }
}

export function buildPlan(form) {
  const raw = generate(toEngineProfile(form))
  return { template: raw.template, model: raw.model, weeks: raw.weeks }
}
