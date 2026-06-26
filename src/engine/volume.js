import { classifyBlend } from './quality.js'

export const BANDS = {
  strength:    { mev: 6,  mav: 10, mrv: 12 },
  balanced:    { mev: 8,  mav: 13, mrv: 18 },
  hypertrophy: { mev: 10, mav: 16, mrv: 22 },
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x))

export function yearsProgress(years) {
  return clamp(years / 5, 0, 1)
}

export function fatigueScale(fatigue) {
  return 1 - (clamp(fatigue, 1, 5) - 1) / 4 * 0.30
}

export function bandForBlend(blend) {
  const { dom, isMixed } = classifyBlend(blend)
  if (dom === 'hypertrophy' && !isMixed) return 'hypertrophy'
  if (isMixed) return 'balanced'
  if (dom === 'power' || dom === 'strength') return 'strength'
  return 'balanced'
}

export function weeklySets(blend, years, fatigue) {
  const band = BANDS[bandForBlend(blend)]
  const base = band.mev + (band.mav - band.mev) * yearsProgress(years)
  const scaled = Math.round(base * fatigueScale(fatigue))
  return clamp(scaled, 4, band.mrv)
}
