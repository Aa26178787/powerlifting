import { classifyBlend } from './quality.js'

export function selectTemplate({ blend, years, daysPerWeek }) {
  if (years < 1) return 'linearLP'
  const { dom, isMixed } = classifyBlend(blend)
  if (isMixed) return 'dup'
  if (dom === 'hypertrophy') return 'hypertrophyBlock'
  const heavy = dom === 'strength' || dom === 'power'
  if (heavy && daysPerWeek >= 5) return 'highFreqPct'
  if (heavy) return 'fiveThreeOne'
  return 'dup'
}
