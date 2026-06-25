import { query } from './exercises.js'

export function styleToken(lift, style) {
  if (lift === 'squat') return style.bar === 'high' ? 'high-bar' : 'low-bar'
  if (lift === 'deadlift') return style.stance === 'sumo' ? 'sumo' : 'conventional'
  return ''
}

export function pick(lift, stickingPoint, style, equipmentAvailable, advanced) {
  const pool = query({
    category: 'variation',
    targetLift: lift,
    equipmentAvailable,
    excludeAdvanced: !advanced,
  })
  if (pool.length === 0) return null
  const token = styleToken(lift, style)
  const score = (e) => {
    let s = 0
    if (stickingPoint && stickingPoint !== 'none' && e.stickingPoint === stickingPoint) s += 2
    if (token && Array.isArray(e.styleBias) && e.styleBias.includes(token)) s += 1
    return s
  }
  return [...pool].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))[0]
}
