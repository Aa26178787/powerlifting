import { query } from './exercises.js'
import { emphasis } from './style.js'
import { shouldAvoid } from './regionStatus.js'

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

export function select({ lift, style, stickingPoint, equipmentAvailable, sessionTimeLimit, mainTimeMin = 0, goalBias = 0, regionStatus, excluded = [], accessoryPreference = 'machine', maxCount = null }) {
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
    if (stickingPoint && stickingPoint !== 'none' && e.stickingPoint === stickingPoint) s += 0.5
    s += prefBonus(movementTypeOf(e), accessoryPreference)
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
  // Only allow a repeated muscle if the pool is exhausted before reaching cap.
  const chosen = []
  const deferred = []
  const seenMuscles = new Set()
  for (const ex of sorted) {
    if (chosen.length >= cap) break
    if (seenMuscles.has(ex.primaryMuscle)) {
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
