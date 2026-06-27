import { query } from './exercises.js'
import { causeOf } from './stickingPoint.js'

// 전문(specialty)·niche 변형 stem — 표준 변형보다 후순위(낮을수록 우선)
const SPECIALTY = [
  'box squat', 'ssb box', 'zercher', 'hatfield', 'anderson', 'cambered',
  'duffalo', 'buffalo', 'zombie', 'cyclist', 'heel-elevated', 'hack',
  'sissy', 'safety squat bar',
]

function isSpecialty(name) {
  const n = name.toLowerCase()
  return SPECIALTY.some((s) => n.includes(s))
}

export function priorityOf(ex) {
  if (typeof ex.priority === 'number') return ex.priority
  return isSpecialty(ex.name) ? 70 : 40
}

export function styleToken(lift, style) {
  if (lift === 'squat') return style.bar === 'high' ? 'high-bar' : 'low-bar'
  if (lift === 'deadlift') return style.stance === 'sumo' ? 'sumo' : 'conventional'
  return ''
}

export function pick(lift, stickingPoint, style, equipmentAvailable, advanced, excluded = [], cause = undefined) {
  const pool = query({
    category: 'variation',
    targetLift: lift,
    equipmentAvailable,
    excludeAdvanced: !advanced,
  }).filter((e) => !excluded.includes(e.name))
  if (pool.length === 0) return null
  const token = styleToken(lift, style)
  const score = (e) => {
    let s = 0
    if (stickingPoint && stickingPoint !== 'none' && e.stickingPoint === stickingPoint) {
      s += 2
      if (cause && causeOf(e).includes(cause)) s += 1
    }
    if (token && Array.isArray(e.styleBias) && e.styleBias.includes(token)) s += 1
    return s
  }
  return [...pool].sort((a, b) => {
    const sa = score(a), sb = score(b)
    // Specialty exercises without a sticking-point match rank below all non-specialty.
    // Only a sticking-point match (score >= 2) elevates a specialty exercise to tier 0.
    const tierA = isSpecialty(a.name) && sa < 2 ? 1 : 0
    const tierB = isSpecialty(b.name) && sb < 2 ? 1 : 0
    return (tierA - tierB) || (sb - sa) || (priorityOf(a) - priorityOf(b)) || a.name.localeCompare(b.name)
  })[0]
}
