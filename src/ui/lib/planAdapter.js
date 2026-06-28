import { generate, resolveE1rm } from '../../engine/generate.js'
import { effectiveLifts } from '../../engine/loadFeedback.js'

export function toEngineProfile(form) {
  return {
    lifts: form.lifts,
    years: form.years,
    age: form.age,
    daysPerWeek: form.daysPerWeek,
    fatigue: form.fatigue,
    qualities: form.qualities,
    periodizationModel: form.periodizationModel,
    style: form.style,
    stickingPoint: form.stickingPoint,
    stickingCause: form.stickingCause ?? {},
    regionStatus: form.regionStatus,
    equipment: form.equipment,
    sessionTimeLimit: form.sessionTimeLimit,
    competition: form.competition,
    priorityLift: form.priorityLift,
    mesoWeeks: form.mesoWeeks,
    deloadEnabled: form.deloadEnabled,
    variationOverride: form.variationOverride ?? {},
    excludedExercises: form.excludedExercises ?? [],
    cueNeed: form.cueNeed ?? {},
    accessoryPreference: form.accessoryPreference,
    frequency: form.frequency,
    volumeOverride: form.volumeOverride,
  }
}

// Shape raw generate output to the public plan contract.
const shape = (raw) => ({ template: raw.template, model: raw.model, weeks: raw.weeks })

// buildPlan(form, liftLog?, opts?)
// Empty / absent liftLog → LITERALLY the same call as before (byte-identical output).
// Non-empty liftLog → derives effective e1RM per lift via EWMA+clamp, then generates.
// generate.js / autoreg.js / toEngineProfile bodies are UNCHANGED.
export function buildPlan(form, liftLog = [], opts = {}) {
  if (!liftLog.length) return shape(generate(toEngineProfile(form)))
  const lifts = effectiveLifts(liftLog, form.lifts, resolveE1rm, opts)
  return shape(generate(toEngineProfile({ ...form, lifts })))
}
