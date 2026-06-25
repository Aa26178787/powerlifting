import { query } from './exercises.js'
import { emphasis } from './style.js'
import { shouldAvoid } from './regionStatus.js'

export function select({ lift, style, stickingPoint, equipmentAvailable, sessionTimeLimit, regionStatus }) {
  const weights = emphasis(lift, style)
  const pool = query({ category: 'accessory', equipmentAvailable, excludeAdvanced: true })
    .filter((e) => e.targetLift === lift || e.targetLift === 'general')
    .filter((e) => !shouldAvoid(e, regionStatus ?? {}))
  const score = (e) => {
    let s = weights[e.primaryMuscle] ?? 1.0
    if (stickingPoint && stickingPoint !== 'none' && e.stickingPoint === stickingPoint) s += 0.5
    return s
  }
  const sorted = [...pool].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))
  const cap = sessionTimeLimit ? Math.max(1, Math.floor(sessionTimeLimit / 15)) : 3
  return sorted.slice(0, cap)
}
