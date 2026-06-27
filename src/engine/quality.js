import { roundToIncrement, loadForRpe } from './e1rm.js'

export const QUALITIES = ['power', 'strength', 'hypertrophy', 'endurance']

export const ZONES = {
  power:       { reps: [2, 4],   repAnchor: 3,  pct: [0.55, 0.70], loading: 'pct', rpeTarget: null },
  strength:    { reps: [2, 5],   repAnchor: 3,  pct: [0.82, 0.92], loading: 'rpe', rpeTarget: 8.5 },
  hypertrophy: { reps: [6, 12],  repAnchor: 9,  pct: [0.67, 0.78], loading: 'rpe', rpeTarget: 8.5 },
  endurance:   { reps: [12, 20], repAnchor: 16, pct: [0.50, 0.62], loading: 'rpe', rpeTarget: 8 },
}

export const DEFAULT_BLEND = { power: 0, strength: 0.5, hypertrophy: 0.4, endurance: 0.1 }

export const PRESETS = {
  powerlifting:  { power: 0.10, strength: 0.70, hypertrophy: 0.20, endurance: 0.00 },
  powerbuilding: { power: 0.10, strength: 0.45, hypertrophy: 0.45, endurance: 0.00 },
  bodybuilding:  { power: 0.00, strength: 0.20, hypertrophy: 0.80, endurance: 0.00 },
  athletic:      { power: 0.40, strength: 0.40, hypertrophy: 0.20, endurance: 0.00 },
  general:       { power: 0.15, strength: 0.30, hypertrophy: 0.40, endurance: 0.15 },
}

export function normalizeBlend(blend) {
  const sum = QUALITIES.reduce((a, q) => a + (blend[q] || 0), 0)
  if (sum <= 0) return { ...DEFAULT_BLEND }
  const out = {}
  for (const q of QUALITIES) out[q] = (blend[q] || 0) / sum
  return out
}

export function presetBlend(key) {
  return PRESETS[key] ? { ...PRESETS[key] } : null
}

export function dominantQuality(blend) {
  let best = QUALITIES[0]
  for (const q of QUALITIES) if ((blend[q] || 0) > (blend[best] || 0)) best = q
  return best
}

export function weightFor(quality, e1rm) {
  const z = ZONES[quality] ?? ZONES.strength
  if (z.loading === 'pct') {
    const mid = (z.pct[0] + z.pct[1]) / 2
    return roundToIncrement(e1rm * mid)
  }
  return loadForRpe(e1rm, z.repAnchor, z.rpeTarget)
}

export function allocateSets(total, blend) {
  const n = normalizeBlend(blend)
  const raw = {}, floors = {}
  let used = 0
  for (const q of QUALITIES) {
    raw[q] = n[q] * total
    floors[q] = Math.floor(raw[q])
    used += floors[q]
  }
  let remaining = total - used
  const byRemainder = [...QUALITIES].sort((a, b) => (raw[b] - floors[b]) - (raw[a] - floors[a]))
  for (const q of byRemainder) {
    if (remaining <= 0) break
    floors[q] += 1
    remaining -= 1
  }
  return floors
}

const PRIORITY = ['strength', 'power', 'hypertrophy', 'endurance']

export function weeklyQualitySchedule(totalSets, blend) {
  const alloc = allocateSets(totalSets, blend)
  const out = []
  for (const q of PRIORITY) for (let i = 0; i < alloc[q]; i++) out.push(q)
  return out
}

export const MIX_GAP = 0.15   // top-2 간격이 이하이면 혼합
export const MIX_MAX = 0.55   // 최대 자질이 이하이면(지배 자질 없음) 혼합

export function classifyBlend(blend) {
  const n = normalizeBlend(blend)
  const sorted = [...QUALITIES].sort((a, b) => n[b] - n[a])
  const dom = sorted[0]
  const second = sorted[1]
  const gap = n[dom] - n[second]
  const isMixed = gap <= MIX_GAP || n[dom] < MIX_MAX
  return { dom, second, gap, isMixed, n }
}
