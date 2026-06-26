import { e1rmFrom } from './e1rm.js'
import { tune } from './tuner.js'
import { buildWorkingWeeks } from './periodization.js'
import { buildDeloadWeek } from './deload.js'
import { MAIN_LIFTS, byName } from './exercises.js'
import { select } from './accessories.js'
import { pick } from './variations.js'
import { shouldSwap } from './regionStatus.js'
import { normalizeBlend, DEFAULT_BLEND } from './quality.js'
import { bandForBlend, BANDS } from './volume.js'
import { buildLayout } from './layoutGenerator.js'
import { defaultFrequency } from './frequency.js'
import { phaseFor } from './periodizationModel.js'
import { pickScheme, expandAccessory, SCHEMES } from './setSchemes.js'

// Accessories support hypertrophy by default; core/ab work trends to endurance.
function accessoryQuality(ex) {
  return /core|ab|oblique/i.test(ex.primaryMuscle ?? '') ? 'endurance' : 'hypertrophy'
}

function withAccessoryScheme(accessories, { weekIndex, advanced, phase, isDeload }) {
  return accessories.map((a, i) => {
    const quality = accessoryQuality(a)
    const key = isDeload
      ? 'straight'
      : pickScheme({ quality, role: 'accessory', phase, advanced, weekIndex: weekIndex + i })
    const expanded = expandAccessory(key, { quality, baseSets: isDeload ? 2 : 3 })
    return {
      ...a,
      quality,
      scheme: { type: key, evidenceTier: SCHEMES[key].evidenceTier, sets: expanded.sets, note: expanded.note },
    }
  })
}

const DEFAULT_STYLE = { squat: { bar: 'low' }, bench: { grip: 'medium' }, deadlift: { stance: 'conventional' } }
const DEFAULT_STICK = { squat: 'none', bench: 'none', deadlift: 'none' }

export function resolveE1rm(liftInput) {
  if (liftInput && typeof liftInput.oneRM === 'number') return liftInput.oneRM
  const { weight, reps, rpe } = liftInput
  return e1rmFrom(weight, reps, rpe)
}

function sparingSwap(ex, baseLift, style, stickingPoint, equipment, advanced, regionStatus, excluded = []) {
  const bad = new Set(Object.entries(regionStatus).filter(([, v]) => v >= 2).map(([k]) => k))
  const candidate = pick(baseLift, stickingPoint, style, equipment, advanced, excluded)
  if (candidate && !candidate.stress.some((r) => bad.has(r))) return candidate.name
  return ex
}

export function generate(profile) {
  const { years, daysPerWeek, fatigue, lifts } = profile
  const blend = normalizeBlend(profile.qualities ?? DEFAULT_BLEND)
  const competition = profile.competition ?? { on: false, date: '' }
  const mesoWeeks = Math.max(3, Math.min(8, profile.mesoWeeks ?? 4))
  const deloadEnabled = profile.deloadEnabled ?? true
  const peaking = !!(competition.on && competition.date)
  const variationOverride = profile.variationOverride ?? {}
  const excludedExercises = profile.excludedExercises ?? []
  const cueNeed = profile.cueNeed ?? {}
  const model = (!profile.periodizationModel || profile.periodizationModel === 'auto')
    ? 'adaptive'
    : profile.periodizationModel
  const style = profile.style ?? DEFAULT_STYLE
  const stickingPoint = profile.stickingPoint ?? DEFAULT_STICK
  const regionStatus = profile.regionStatus ?? {}
  const equipment = profile.equipment ?? ['barbell', 'rack', 'bench']
  const advanced = years >= 3
  const freqInput = profile.frequency ?? defaultFrequency(daysPerWeek)
  const frequency = {}
  for (const lift of MAIN_LIFTS) frequency[lift] = Math.max(0, Math.min(daysPerWeek, freqInput[lift] ?? 0))

  const e1rm = {}
  for (const lift of MAIN_LIFTS) e1rm[lift] = resolveE1rm(lifts[lift])

  const tuned = tune({ blend, years, daysPerWeek, fatigue, age: profile.age, frequency })
  const mrv = BANDS[bandForBlend(blend)].mrv
  const layout = buildLayout({ daysPerWeek, frequency })
  const slotCounts = {}
  for (const day of layout) for (const slot of day) slotCounts[slot.lift] = (slotCounts[slot.lift] || 0) + 1
  const cappedSetsPerSession = {}
  for (const lift of MAIN_LIFTS) {
    const sc = slotCounts[lift] || 1
    cappedSetsPerSession[lift] = Math.max(1, Math.min(tuned.setsPerSession[lift], Math.floor(mrv / sc)))
  }
  const priorityLift = profile.priorityLift
  if (priorityLift && MAIN_LIFTS.includes(priorityLift)) {
    const sc = slotCounts[priorityLift] || 1
    cappedSetsPerSession[priorityLift] = Math.max(1, Math.min(cappedSetsPerSession[priorityLift] + 1, Math.floor(mrv / sc)))
  }
  const ctx = { e1rm, setsPerSession: cappedSetsPerSession, mrv, style, stickingPoint, equipment, advanced, regionStatus, blend, model, competition, variationOverride, excludedExercises, cueNeed, peaking, totalWeeks: mesoWeeks, years }

  const working = buildWorkingWeeks(layout, ctx, mesoWeeks)
  const allWeeks = deloadEnabled ? [...working, buildDeloadWeek(working[working.length - 1], ctx)] : working

  const weeks = allWeeks.map((wk) => ({
    ...wk,
    sessions: wk.sessions.map((s) => {
      const notes = []
      const exercises = s.exercises
        .map((e) => {
          const ex = byName(e.lift)
          if (ex && shouldSwap(ex, regionStatus)) {
            return { ...e, lift: sparingSwap(e.lift, e.baseLift, style[e.baseLift], stickingPoint[e.baseLift], equipment, advanced, regionStatus, excludedExercises) }
          }
          return e
        })
      const kept = exercises.filter((e) => {
        if (e.sets >= 1) return true
        if (MAIN_LIFTS.includes(e.baseLift)) {
          const ex = byName(e.lift)
          const region = (ex ? ex.stress : []).find((r) => (regionStatus[r] ?? 0) === 3) ?? 'injury'
          notes.push(`${e.baseLift} omitted this week due to severe ${region} status`)
        }
        return false
      })
      const primary = kept[0]?.baseLift ?? 'squat'
      const rawAccessories = select({ lift: primary, style: style[primary], stickingPoint: stickingPoint[primary], equipmentAvailable: equipment, sessionTimeLimit: profile.sessionTimeLimit, regionStatus, excluded: excludedExercises, accessoryPreference: profile.accessoryPreference })
      const accessories = withAccessoryScheme(rawAccessories, {
        weekIndex: wk.index - 1,
        advanced,
        phase: phaseFor(wk.index - 1, mesoWeeks, peaking),
        isDeload: wk.isDeload,
      })
      return { ...s, exercises: kept, accessories, notes }
    }),
  }))

  return { template: 'custom', model, weeks }
}
