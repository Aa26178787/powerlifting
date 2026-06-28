import { query } from './exercises.js'
import { emphasis } from './style.js'
import { shouldAvoid } from './regionStatus.js'
import { muscleDeficit, isOverMrv, ACCESSORY_EST_SETS } from './muscleVolume.js'
import { stickTier } from './stickingPoint.js'

const MACHINE_EQUIP = ['machine', 'cables', 'smith', 'preacher']   // 'machine' substring catches "* machine"
const SKILL_RX = /step-up|sled|yoke|sissy|dragon flag|kettlebell|kb swing|pistol|nordic|cossack|single-leg|single-arm|farmer|landmine twist|russian twist/i

export function movementTypeOf(ex) {
  if (ex.movementType) return ex.movementType
  if ((ex.equipment ?? []).some((e) => MACHINE_EQUIP.some((m) => e.includes(m)))) return 'machine'
  if (SKILL_RX.test(ex.name)) return 'skill'
  return 'free'
}

function prefBonus(type, pref) {
  if (type === 'skill') return -0.5   // skill/unstable always demoted (niche regardless of machine/free preference)
  if (pref === 'any') return 0
  if (pref === 'machine') return type === 'machine' ? 0.3 : 0
  if (pref === 'free')    return type === 'free'    ? 0.3 : 0
  return 0
}

const STICK_W_ACC = { full: 0.75, position: 0.5, causeMiss: 0.35, none: 0 }   // heuristic

export function select({ lift, style, stickingPoint, cause = undefined, equipmentAvailable, sessionTimeLimit, mainTimeMin = 0, goalBias = 0, regionStatus, excluded = [], accessoryPreference = 'machine', maxCount = null, muscleLedger = null, muscleBands = null, deficitWeight = 0 }) {
  const weights = emphasis(lift, style)
  const pool = query({ category: 'accessory', equipmentAvailable, excludeAdvanced: true })
    .filter((e) => e.targetLift === lift || e.targetLift === 'general')
    .filter((e) => !shouldAvoid(e, regionStatus ?? {}))
    .filter((e) => !excluded.includes(e.name))
  const score = (e) => {
    const matched = Object.entries(weights)
      .filter(([muscle]) => e.primaryMuscle.includes(muscle))
      .map(([, w]) => w)
    let s = matched.length ? Math.max(...matched) : 0.5
    s += STICK_W_ACC[stickTier(e, stickingPoint, cause)]
    s += prefBonus(movementTypeOf(e), accessoryPreference)
    if (muscleLedger && deficitWeight > 0)
      s += deficitWeight * muscleDeficit(muscleLedger, e.primaryMuscle)
    return s
  }
  const sorted = [...pool].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))

  // Cap computation. If maxCount is provided (caller has pre-split a shared budget),
  // use it directly. Otherwise derive from session time + goal bias.
  // Time-limited: remaining = sessionTimeLimit − main-work minutes − 10 min buffer.
  // Goal-scaled: hypertrophy +1 (more volume for growth), strength/power −1 (floor 2).
  // Final cap always [1,5].
  let cap
  if (maxCount != null) {
    cap = maxCount
  } else if (sessionTimeLimit != null) {
    const remaining = sessionTimeLimit - mainTimeMin - 10
    const baseCap = Math.min(4, Math.max(1, Math.floor(remaining / 10)))
    const minCap = goalBias < 0 ? 2 : 1
    cap = Math.min(5, Math.max(minCap, baseCap + goalBias))
  } else {
    const minCap = goalBias < 0 ? 2 : 1
    cap = Math.min(5, Math.max(minCap, 3 + goalBias))
  }

  // Diversity guard: greedily pick, deferring repeats of already-chosen primaryMuscle.
  // Also defer exercises whose prime mover would exceed MRV in the weekly ledger.
  // Only allow deferred exercises if the pool is exhausted before reaching cap.
  const chosen = []
  const deferred = []
  const seenMuscles = new Set()
  for (const ex of sorted) {
    if (chosen.length >= cap) break
    if (seenMuscles.has(ex.primaryMuscle) ||
        (muscleLedger && isOverMrv(muscleLedger, ex.primaryMuscle, ACCESSORY_EST_SETS))) {
      deferred.push(ex)
    } else {
      chosen.push(ex)
      seenMuscles.add(ex.primaryMuscle)
    }
  }
  // Fill from deferred only if pool is under-filled (exhausted without hitting cap)
  let di = 0
  while (chosen.length < cap && di < deferred.length) chosen.push(deferred[di++])
  return chosen
}

// Lengthened-position / lengthened-partial emphasis (B4, 중-강). Including the
// stretched range is the primary ROM consideration for hypertrophy. We tag
// accessories whose movement is biased toward long muscle length by name stem
// (no DB schema change). Selection specifics heuristic (근거 약함).
const LENGTHENED_RX = /romanian|rdl|stiff-leg|incline|overhead|deficit|split squat|bulgarian|lunge|pullover|preacher|seated|deep|stretch/i
export function lengthenedNote(ex) {
  return LENGTHENED_RX.test(ex?.name ?? '')
    ? '긴 근육 길이 강조 — 늘어난 구간(스트레치)에서 통제하면 근비대 자극↑ (lengthened-position)'
    : null
}

// First-in-session work gets the greatest adaptation (B6, 중). When the goal is
// hypertrophy-leaning (goalBias >= 0) and the user declared a priority lift,
// surface that lift's accessories first. Strength/power plans (goalBias < 0) keep
// competition-specific order. Stable: relative order within each group preserved.
export function orderByPriority(accessories, { priorityLift, goalBias = 0 } = {}) {
  if (goalBias < 0 || !priorityLift) return accessories
  const first = [], rest = []
  for (const a of accessories) (a.targetLift === priorityLift ? first : rest).push(a)
  return [...first, ...rest]
}
