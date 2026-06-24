export function desiredFrequency(goal, daysPerWeek) {
  const squat = 2
  const bench = daysPerWeek >= 6 ? 3 : 2
  const deadlift = daysPerWeek >= 5 ? 2 : 1
  return { squat, bench, deadlift }
}
