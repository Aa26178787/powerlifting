export function planToCsv(plan) {
  const rows = ['week,deload,day,lift,sets,reps,pct,rpe,weight']
  for (const wk of plan.weeks) {
    for (const s of wk.sessions) {
      for (const ex of s.exercises) {
        const pct = ex.pct == null ? '' : ex.pct
        rows.push([
          wk.index, wk.isDeload ? 'yes' : 'no', s.day, ex.lift,
          ex.sets, ex.reps, pct, ex.rpeTarget, ex.weight,
        ].join(','))
      }
    }
  }
  return rows.join('\n') + '\n'
}
