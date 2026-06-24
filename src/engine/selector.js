export function selectTemplate({ goal, years, daysPerWeek }) {
  if (goal === 'hypertrophy') return 'hypertrophyBlock'
  if (years < 1) return 'linearLP'
  if (goal === 'strength' && daysPerWeek >= 5) return 'highFreqPct'
  if (goal === 'strength' && daysPerWeek <= 4) return 'fiveThreeOne'
  return 'dup'
}
