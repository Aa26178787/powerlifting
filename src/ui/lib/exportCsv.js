import { liftLabel } from '../i18n.js'

export function planToCsv(plan) {
  const rows = ['주차,디로드,일차,종목,세트,반복,%1RM,RPE,중량']
  for (const wk of plan.weeks) {
    for (const s of wk.sessions) {
      for (const ex of s.exercises) {
        const pct = ex.pct == null ? '' : ex.pct
        rows.push([
          wk.index, wk.isDeload ? '예' : '아니오', s.day, liftLabel(ex.lift),
          ex.sets, ex.reps, pct, ex.rpeTarget, ex.weight,
        ].join(','))
      }
    }
  }
  return rows.join('\n') + '\n'
}
