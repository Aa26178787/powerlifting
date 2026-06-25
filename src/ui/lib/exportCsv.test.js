import { describe, it, expect } from 'vitest'
import { planToCsv } from './exportCsv.js'

const plan = {
  template: 'dup',
  weeks: [
    { index: 1, isDeload: false, sessions: [
      { day: 1, exercises: [
        { lift: 'squat', sets: 5, reps: [2, 5], repAnchor: 3, quality: 'strength', pct: 87, rpeTarget: 9, weight: 162.5, autoregulate: true },
      ], accessories: [] },
    ] },
    { index: 4, isDeload: true, sessions: [
      { day: 1, exercises: [
        { lift: 'squat', sets: 3, reps: [2, 5], repAnchor: 3, quality: 'strength', pct: null, rpeTarget: null, weight: 120, autoregulate: true },
      ], accessories: [] },
    ] },
  ],
}

describe('planToCsv', () => {
  it('emits a header and one row per exercise', () => {
    const csv = planToCsv(plan)
    const lines = csv.trim().split('\n')
    expect(lines[0]).toBe('주차,디로드,일차,종목,목표,세트,반복,%1RM,RPE,중량')
    expect(lines[1]).toBe('1,아니오,1,스쿼트,근력,5,2-5,87,9,162.5')
    expect(lines[2]).toBe('4,예,1,스쿼트,근력,3,2-5,,,120')
  })
})
