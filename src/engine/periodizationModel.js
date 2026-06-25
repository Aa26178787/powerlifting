import { QUALITIES, normalizeBlend } from './quality.js'

const WAVE = [0, 0.5, 1.0]

export const MODELS = {
  linear:     { weekOffsets: WAVE, undulation: 0,   emphasisConcentration: 0 },
  undulating: { weekOffsets: WAVE, undulation: 0.5, emphasisConcentration: 0 },
  block:      { weekOffsets: WAVE, undulation: 0.3, emphasisConcentration: 1 },
  // The default hybrid: linear weekly intensity wave + within-week DUP (via the
  // quality schedule) + adaptive block-style concentration that grows late in
  // the mesocycle / as a meet nears. Not a textbook pick — a continuous mix.
  adaptive:   { weekOffsets: WAVE, undulation: 0.5, emphasisConcentration: 0.5 },
}

// 'auto' and any unknown value resolve to the adaptive hybrid. Explicit
// textbook models still pass through unchanged.
export function resolveModel(model) {
  if (!model || model === 'auto') return 'adaptive'
  return MODELS[model] ? model : 'adaptive'
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

function dominantQuality(n) {
  return QUALITIES.reduce((best, q) => (n[q] > n[best] ? q : best), QUALITIES[0])
}

// Peaking pulls toward strength as a meet nears; otherwise concentrate the
// athlete's own dominant quality.
function peakTarget(n, competition) {
  if (competition && competition.on && competition.date) return 'strength'
  return dominantQuality(n)
}

// How block-like THIS week is, in [0,1]: rises late in the mesocycle, with a
// strong dominant quality, and as a meet approaches. An even blend with no meet
// stays ~0 → fully concurrent (DUP-only). Continuous, never a hard switch.
function adaptiveConcentration(weekIndex, n, competition) {
  const dom = Math.max(...QUALITIES.map((q) => n[q]))     // 0.25 (even) .. 1
  const domPull = Math.max(0, (dom - 0.4) / 0.6)          // 0 at <=0.4 -> 1 at 1.0
  const meetPull = competition && competition.on && competition.date ? 0.5 : 0
  const weekProg = [0.1, 0.4, 0.75][weekIndex] ?? 0.1     // later weeks more block-like
  return Math.min(1, (domPull + meetPull) * weekProg)
}

function lerpBlend(n, target, t) {
  const out = {}
  for (const q of QUALITIES) out[q] = n[q] * (1 - t) + (target[q] || 0) * t
  return out
}

export function weekPlan(model, weekIndex, blend, competition) {
  const m = resolveModel(model)
  const rpeOffset = (MODELS[m] ?? MODELS.adaptive).weekOffsets[weekIndex] ?? 0
  if (m === 'block') {
    const order = QUALITIES.filter((q) => (blend[q] || 0) > 0).sort((a, b) => (blend[b] || 0) - (blend[a] || 0))
    const emphasis = order.length ? order[weekIndex % order.length] : 'strength'
    return { rpeOffset, blend: oneHot(emphasis) }
  }
  if (m === 'adaptive') {
    const n = normalizeBlend(blend)
    const conc = adaptiveConcentration(weekIndex, n, competition)
    const target = oneHot(peakTarget(n, competition))
    return { rpeOffset, blend: lerpBlend(n, target, conc) }
  }
  return { rpeOffset, blend }   // linear / undulating: concurrent (within-week DUP via schedule)
}
