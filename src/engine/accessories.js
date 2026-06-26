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

export function select({ lift, style, stickingPoint, equipmentAvailable, sessionTimeLimit, regionStatus, excluded = [], accessoryPreference = 'machine' }) {
  const weights = emphasis(lift, style)
  const pool = query({ category: 'accessory', equipmentAvailable, excludeAdvanced: true })
    .filter((e) => e.targetLift === lift || e.targetLift === 'general')
    .filter((e) => !shouldAvoid(e, regionStatus ?? {}))
    .filter((e) => !excluded.includes(e.name))
  const score = (e) => {
    const matched = Object.entries(weights)
      .filter(([muscle]) => e.primaryMuscle.includes(muscle))
      .map(([, w]) => w)
    let s = matched.length ? Math.max(...matched) : 1.0
    if (stickingPoint && stickingPoint !== 'none' && e.stickingPoint === stickingPoint) s += 0.5
    s += prefBonus(movementTypeOf(e), accessoryPreference)
    return s
  }
  const sorted = [...pool].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))
  const cap = sessionTimeLimit ? Math.max(1, Math.floor(sessionTimeLimit / 15)) : 3
  return sorted.slice(0, cap)
}
