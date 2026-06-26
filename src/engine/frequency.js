// 사용자가 빈도 미설정 시 기본값(현재 동작 보존). daysPerWeek로 시드.
export function defaultFrequency(daysPerWeek) {
  return {
    squat: 2,
    bench: daysPerWeek >= 6 ? 3 : 2,
    deadlift: daysPerWeek >= 5 ? 2 : 1,
  }
}
