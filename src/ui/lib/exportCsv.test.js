import { describe, it, expect } from 'vitest'
import { planToCsv } from './exportCsv.js'

const plan = {
  template: 'dup',
  weeks: [
    { index: 1, isDeload: false, sessions: [
      { day: 1, exercises: [
        { lift: 'squat', sets: 5, reps: 5, pct: 81.1, rpeTarget: 8, weight: 162.5, velocity: null },
      ], accessories: [] },
    ] },
    { index: 4, isDeload: true, sessions: [
      { day: 1, exercises: [
        { lift: 'squat', sets: 3, reps: 5, pct: null, rpeTarget: 6, weight: 120, velocity: null },
      ], accessories: [] },
    ] },
  ],
}

describe('planToCsv', () => {
  it('emits a header and one row per exercise', () => {
    const csv = planToCsv(plan)
    const lines = csv.trim().split('\n')
    expect(lines[0]).toBe('주차,디로드,일차,종목,세트,반복,%1RM,RPE,중량')
    expect(lines[1]).toBe('1,아니오,1,스쿼트,5,5,81.1,8,162.5')
    expect(lines[2]).toBe('4,예,1,스쿼트,3,5,,6,120')
  })
})
