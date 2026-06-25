import { generate } from './generate.js'

const plan = generate({
  lifts: { squat: { oneRM: 200 }, bench: { oneRM: 140 }, deadlift: { oneRM: 240 } },
  years: 3, daysPerWeek: 4, qualities: { power: 0, strength: 0.5, hypertrophy: 0.5, endurance: 0 }, periodizationModel: 'auto', fatigue: 2,
})

console.log(`Template: ${plan.template}`)
console.log(`Model: ${plan.model}`)
for (const week of plan.weeks) {
  console.log(`\n== Week ${week.index}${week.isDeload ? ' (DELOAD)' : ''} ==`)
  for (const session of week.sessions) {
    const line = session.exercises
      .map((e) => `${e.quality} ${e.lift} ${e.sets}x${e.reps[0]}-${e.reps[1]} ≈ ${e.weight}`)
      .join(' | ')
    console.log(`Day ${session.day}: ${line}`)
  }
}
