import { generate } from './generate.js'

const plan = generate({
  lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
  years: 3, daysPerWeek: 4, goal: 'strength', fatigue: 2,
})

console.log(`Template: ${plan.template}`)
for (const week of plan.weeks) {
  console.log(`\n== Week ${week.index}${week.isDeload ? ' (DELOAD)' : ''} ==`)
  for (const session of week.sessions) {
    const line = session.exercises
      .map((e) => `${e.lift} ${e.sets}x${e.reps} @ RPE${e.rpeTarget} = ${e.weight}`)
      .join(' | ')
    console.log(`Day ${session.day}: ${line}`)
  }
}
