import { e1rmFrom } from './e1rm.js'
import { selectTemplate } from './selector.js'
import { tune } from './tuner.js'
import { buildWorkingWeeks } from './periodization.js'
import { buildDeloadWeek } from './deload.js'
import { MAIN_LIFTS, byName } from './exercises.js'
import { select } from './accessories.js'
import { pick } from './variations.js'
import { shouldSwap } from './regionStatus.js'
import { normalizeBlend, DEFAULT_BLEND } from './quality.js'
import { bandForBlend, BANDS } from './volume.js'
import { getTemplate } from './templates.js'

const DEFAULT_STYLE = { squat: { bar: 'low' }, bench: { grip: 'medium' }, deadlift: { stance: 'conventional' } }
const DEFAULT_STICK = { squat: 'none', bench: 'none', deadlift: 'none' }

export function resolveE1rm(liftInput) {
  if (liftInput && typeof liftInput.oneRM === 'number') return liftInput.oneRM
  const { weight, reps, rpe } = liftInput
  return e1rmFrom(weight, reps, rpe)
}

function sparingSwap(ex, baseLift, style, stickingPoint, equipment, advanced, regionStatus) {
  const bad = new Set(Object.entries(regionStatus).filter(([, v]) => v >= 2).map(([k]) => k))
  const candidate = pick(baseLift, stickingPoint, style, equipment, advanced)
  if (candidate && !candidate.stress.some((r) => bad.has(r))) return candidate.name
  return ex
}

export function generate(profile) {
  const { years, daysPerWeek, fatigue, lifts } = profile
  const blend = normalizeBlend(profile.qualities ?? DEFAULT_BLEND)
  const competition = profile.competition ?? { on: false, date: '' }
  const model = (!profile.periodizationModel || profile.periodizationModel === 'auto')
    ? 'adaptive'
    : profile.periodizationModel
  const style = profile.style ?? DEFAULT_STYLE
  const stickingPoint = profile.stickingPoint ?? DEFAULT_STICK
  const regionStatus = profile.regionStatus ?? {}
  const equipment = profile.equipment ?? ['barbell', 'rack', 'bench']
  const advanced = years >= 3

  const e1rm = {}
  for (const lift of MAIN_LIFTS) e1rm[lift] = resolveE1rm(lifts[lift])

  const template = selectTemplate({ blend, years, daysPerWeek })
  const tuned = tune({ blend, years, daysPerWeek, fatigue })
  const mrv = BANDS[bandForBlend(blend)].mrv
  const layout = getTemplate(template).layouts[daysPerWeek]
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
  const ctx = { e1rm, setsPerSession: cappedSetsPerSession, style, stickingPoint, equipment, advanced, regionStatus, blend, model, competition }

  const working = buildWorkingWeeks(template, daysPerWeek, ctx)
  const deload = buildDeloadWeek(working[working.length - 1], ctx)
  const allWeeks = [...working, deload]

  const weeks = allWeeks.map((wk) => ({
    ...wk,
    sessions: wk.sessions.map((s) => {
      const notes = []
      const exercises = s.exercises
        .map((e) => {
          const ex = byName(e.lift)
          if (ex && shouldSwap(ex, regionStatus)) {
            return { ...e, lift: sparingSwap(e.lift, e.baseLift, style[e.baseLift], stickingPoint[e.baseLift], equipment, advanced, regionStatus) }
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
      const accessories = select({ lift: primary, style: style[primary], stickingPoint: stickingPoint[primary], equipmentAvailable: equipment, sessionTimeLimit: profile.sessionTimeLimit, regionStatus })
      return { ...s, exercises: kept, accessories, notes }
    }),
  }))

  return { template, model, weeks }
}
