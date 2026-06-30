import { generate, resolveE1rm } from '../../engine/generate.js'
import { generateOverload } from '../../engine/overload.js'
import { effectiveLifts } from '../../engine/loadFeedback.js'

export function toEngineProfile(form) {
  return {
    lifts: form.lifts,
    years: form.years,
    age: form.age,
    bodyweight: form.bodyweight,   // required by street-lifting (Feature 5)
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
    accessoryPicks: form.accessoryPicks ?? [],
    accessoryOverrides: form.accessoryOverrides ?? {},
    accessorySchemeOverrides: form.accessorySchemeOverrides ?? {},
    backoffRpeDrop: form.backoffRpeDrop ?? 0,
    streetLifting: form.streetLifting,
    cueNeed: form.cueNeed ?? {},
    accessoryPreference: form.accessoryPreference,
    frequency: form.frequency,
    volumeOverride: form.volumeOverride,
    overload: form.overload,
  }
}

// Shape raw generate output to the public plan contract.
// Forwards overload metadata when present (generateOverload attaches it).
const shape = (raw) => {
  const out = { template: raw.template, model: raw.model, weeks: raw.weeks }
  if (raw.overload) out.overload = raw.overload
  return out
}

// buildPlan(form, liftLog?, opts?)
// Empty / absent liftLog → LITERALLY the same call as before (byte-identical output).
// Non-empty liftLog → derives effective e1RM per lift via EWMA+clamp, then generates.
// When form.overload?.enabled, routes to generateOverload; otherwise generate (unchanged).
// generate.js / autoreg.js / toEngineProfile bodies are UNCHANGED.
export function buildPlan(form, liftLog = [], opts = {}) {
  const planFn = form.overload?.enabled ? generateOverload : generate
  if (!liftLog.length) return shape(planFn(toEngineProfile(form)))
  const lifts = effectiveLifts(liftLog, form.lifts, resolveE1rm, opts)
  return shape(planFn(toEngineProfile({ ...form, lifts })))
}
