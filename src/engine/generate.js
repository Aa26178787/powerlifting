import { e1rmFrom } from './e1rm.js'
import { selectTemplate } from './selector.js'
import { tune } from './tuner.js'
import { buildWorkingWeeks } from './periodization.js'
import { buildDeloadWeek } from './deload.js'
import { MAIN_LIFTS, byName } from './exercises.js'
import { select } from './accessories.js'
import { pick } from './variations.js'
import { shouldSwap } from './regionStatus.js'

const DEFAULT_STYLE = { squat: { bar: 'low' }, bench: { grip: 'medium' }, deadlift: { stance: 'conventional' } }
const DEFAULT_STICK = { squat: 'none', bench: 'none', deadlift: 'none' }

export function resolveE1rm(liftInput) {
  if (liftInput && typeof liftInput.oneRM === 'number') return liftInput.oneRM
  const { weight, reps, rpe } = liftInput
  return e1rmFrom(weight, reps, rpe)
}

function sparingSwap(ex, baseLift, style, stickingPoint, equipment, advanced, regionStatus) {
  // pick a variation of baseLift whose stress excludes any status>=2 region
  const bad = new Set(Object.entries(regionStatus).filter(([, v]) => v >= 2).map(([k]) => k))
  const candidate = pick(baseLift, stickingPoint, style, equipment, advanced)
  if (candidate && !candidate.stress.some((r) => bad.has(r))) return candidate.name
  return ex // keep (already volume-scaled)
}

export function generate(profile) {
  const { lifts, years, daysPerWeek, goal, fatigue } = profile
  const style = profile.style ?? DEFAULT_STYLE
  const stickingPoint = profile.stickingPoint ?? DEFAULT_STICK
  const regionStatus = profile.regionStatus ?? {}
  const equipment = profile.equipment ?? ['barbell', 'rack', 'bench']
  const advanced = years >= 3

  const e1rm = {}
  for (const lift of MAIN_LIFTS) e1rm[lift] = resolveE1rm(lifts[lift])

  const template = selectTemplate({ goal, years, daysPerWeek })
  const tuned = tune({ goal, years, daysPerWeek, fatigue })
  const ctx = { e1rm, setsPerSession: tuned.setsPerSession, style, stickingPoint, equipment, advanced, regionStatus }

  const working = buildWorkingWeeks(template, daysPerWeek, ctx)
  const deload = buildDeloadWeek(working[working.length - 1], ctx)
  const allWeeks = [...working, deload]

  const weeks = allWeeks.map((wk) => ({
    ...wk,
    sessions: wk.sessions.map((s) => {
      const mapped = s.exercises.map((e) => {
        const ex = byName(e.lift)
        if (ex && shouldSwap(ex, regionStatus)) {
          const swapped = sparingSwap(e.lift, e.baseLift, style[e.baseLift], stickingPoint[e.baseLift], equipment, advanced, regionStatus)
          return { ...e, lift: swapped }
        }
        return e
      })
      const notes = []
      for (const e of mapped) {
        if (e.sets < 1 && MAIN_LIFTS.includes(e.baseLift)) {
          const ex = byName(e.lift)
          const stressedRegions = ex ? ex.stress : []
          const severeRegion = stressedRegions.find((r) => regionStatus[r] === 3)
          const region = severeRegion ?? 'injury'
          notes.push(`${e.baseLift} omitted this week due to severe ${region} status`)
        }
      }
      const exercises = mapped.filter((e) => e.sets >= 1)
      const primary = exercises[0]?.baseLift ?? 'squat'
      const accessories = select({ lift: primary, style: style[primary], stickingPoint: stickingPoint[primary], equipmentAvailable: equipment, sessionTimeLimit: profile.sessionTimeLimit, regionStatus })
      return { ...s, exercises, accessories, notes }
    }),
  }))

  return { template, weeks }
}
