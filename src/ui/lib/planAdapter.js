import { generate } from '../../engine/generate.js'
import { allEquipment } from '../../engine/exercises.js'
import { excludeTags } from '../../engine/excludableTools.js'

export function toEngineProfile(form) {
  const excluded = excludeTags(form.excludedTools ?? [])
  const filteredEquipment = allEquipment().filter((t) => !excluded.includes(t))

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
    // Equipment is filtered based on excludedTools; assume the athlete has
    // everything except what is explicitly excluded via tool groups.
    equipment: filteredEquipment,
    sessionTimeLimit: form.sessionTimeLimit,
    competition: form.competition,
    priorityLift: form.priorityLift,
    mesoWeeks: form.mesoWeeks,
    deloadEnabled: form.deloadEnabled,
    variationOverride: form.variationOverride ?? {},
  }
}

export function buildPlan(form) {
  const raw = generate(toEngineProfile(form))
  return { template: raw.template, model: raw.model, weeks: raw.weeks }
}
