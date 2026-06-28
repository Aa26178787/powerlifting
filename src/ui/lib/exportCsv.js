import { exerciseName, qualityLabel } from '../i18n.js'
import { toDisplay, unitLabel } from './units.js'

/**
 * RFC 4180 CSV field escaping.
 * - If the field starts with =, +, -, or @, prefix with ' to prevent formula injection.
 * - If the field contains comma, double-quote, CR, or LF, wrap in double-quotes and escape inner quotes by doubling.
 * - Otherwise return as-is.
 */
function csvField(v) {
  const s = String(v ?? '')

  // Check if needs quoting: contains comma, quote, CR, or LF
  const needsQuoting = /[,"\r\n]/.test(s)

  if (needsQuoting) {
    // Escape inner double-quotes by doubling, then wrap in quotes
    return '"' + s.replace(/"/g, '""') + '"'
  }

  // Check for formula injection: starts with =, +, -, or @
  if (/^[=+\-@]/.test(s)) {
    return "'" + s
  }

  return s
}

export function planToCsv(plan, units = 'kg') {
  const rows = [`주차,디로드,일차,종목,목표,세트번호,중량(${unitLabel(units)}),반복,RPE,비고`]
  for (const wk of plan.weeks) {
    for (const s of wk.sessions) {
      for (const ex of s.exercises) {
        if (!ex.scheme || !ex.scheme.sets || ex.scheme.sets.length === 0) continue
        ex.scheme.sets.forEach((set, i) => {
          rows.push([
            wk.index,
            wk.isDeload ? '예' : '아니오',
            s.day,
            exerciseName(ex.lift),
            qualityLabel(ex.quality),
            i + 1,
            toDisplay(set.weight, units),
            set.reps,
            set.rpe ?? '',
            set.note ?? '',
          ].map(csvField).join(','))
        })
      }
      for (const acc of s.accessories ?? []) {
        if (!acc.scheme || !acc.scheme.sets || acc.scheme.sets.length === 0) continue
        acc.scheme.sets.forEach((set, i) => {
          rows.push([
            wk.index,
            wk.isDeload ? '예' : '아니오',
            s.day,
            exerciseName(acc.name),
            qualityLabel(acc.quality),
            i + 1,
            '체감', // accessories have no tracked 1RM → load by feel
            set.reps,
            set.rpe ?? '',
            set.note ?? '',
          ].map(csvField).join(','))
        })
      }
    }
  }
  return rows.join('\n') + '\n'
}
