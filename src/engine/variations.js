import { query } from './exercises.js'

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

export function pick(lift, stickingPoint, style, equipmentAvailable, advanced, excluded = []) {
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
    if (stickingPoint && stickingPoint !== 'none' && e.stickingPoint === stickingPoint) s += 2
    if (token && Array.isArray(e.styleBias) && e.styleBias.includes(token)) s += 1
    return s
  }
  return [...pool].sort((a, b) =>
    (score(b) - score(a)) ||
    (priorityOf(a) - priorityOf(b)) ||
    a.name.localeCompare(b.name)
  )[0]
}
