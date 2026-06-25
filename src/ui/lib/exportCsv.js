import { liftLabel, qualityLabel } from '../i18n.js'
import { toDisplay, unitLabel } from './units.js'

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
            liftLabel(ex.lift),
            qualityLabel(ex.quality),
            i + 1,
            toDisplay(set.weight, units),
            set.reps,
            set.rpe ?? '',
            set.note ?? '',
          ].join(','))
        })
      }
      for (const acc of s.accessories ?? []) {
        if (!acc.scheme || !acc.scheme.sets || acc.scheme.sets.length === 0) continue
        acc.scheme.sets.forEach((set, i) => {
          rows.push([
            wk.index,
            wk.isDeload ? '예' : '아니오',
            s.day,
            liftLabel(acc.name),
            qualityLabel(acc.quality),
            i + 1,
            '체감', // accessories have no tracked 1RM → load by feel
            set.reps,
            set.rpe ?? '',
            set.note ?? '',
          ].join(','))
        })
      }
    }
  }
  return rows.join('\n') + '\n'
}
