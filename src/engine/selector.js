import { dominantQuality } from './quality.js'

export function selectTemplate({ blend, years, daysPerWeek }) {
  const dom = dominantQuality(blend)

  // Check if there's a clear dominant (significantly higher than second-best)
  const sorted = Object.values(blend).sort((a, b) => b - a)
  const isBalanced = sorted[0] === sorted[1]

  if (dom === 'hypertrophy' && !isBalanced) return 'hypertrophyBlock'
  if (years < 1) return 'linearLP'

  const heavy = dom === 'strength' || dom === 'power'
  if (heavy && !isBalanced && daysPerWeek >= 5) return 'highFreqPct'
  if (heavy && !isBalanced && daysPerWeek <= 4) return 'fiveThreeOne'
  return 'dup'
}
