import { QUALITIES, normalizeBlend } from './quality.js'

const WAVE = [0, 0.5, 1.0]

export const MODELS = {
  linear:     { weekOffsets: WAVE, undulation: 0,   emphasisConcentration: 0 },
  undulating: { weekOffsets: WAVE, undulation: 0.5, emphasisConcentration: 0 },
  block:      { weekOffsets: WAVE, undulation: 0.3, emphasisConcentration: 1 },
}

export function recommendModel({ competition, blend, progressTrend = 'unknown' }) {
  if (competition && competition.on && competition.date) return 'block'
  if (progressTrend === 'stall') return 'block'
  const n = normalizeBlend(blend)
  if (n.strength >= 0.6) return 'linear'
  return 'undulating'
}

function oneHot(quality) {
  const b = {}
  for (const q of QUALITIES) b[q] = q === quality ? 1 : 0
  return b
}

export function weekPlan(model, weekIndex, blend, competition) {
  const rpeOffset = (MODELS[model] ?? MODELS.undulating).weekOffsets[weekIndex] ?? 0
  if (model === 'block') {
    const order = QUALITIES.filter((q) => (blend[q] || 0) > 0).sort((a, b) => (blend[b] || 0) - (blend[a] || 0))
    const emphasis = order.length ? order[weekIndex % order.length] : 'strength'
    return { rpeOffset, blend: oneHot(emphasis) }
  }
  return { rpeOffset, blend }
}
