import { describe, it, expect } from 'vitest'
import { planToCsv } from './exportCsv.js'

const plan = {
  template: 'dup',
  weeks: [
    { index: 1, isDeload: false, sessions: [
      { day: 1, exercises: [
        {
          lift: 'squat', sets: 2, reps: [2, 5], repAnchor: 3, quality: 'strength',
          pct: 87, rpeTarget: 9, weight: 162.5, autoregulate: true,
          scheme: {
            type: 'topSetBackoff',
            evidenceTier: 'consensus',
            sets: [
              { weight: 162.5, reps: 3, rpe: 9 },
              { weight: 142.5, reps: 5, rpe: 8 },
            ],
          },
        },
      ], accessories: [] },
    ] },
    { index: 4, isDeload: true, sessions: [
      { day: 1, exercises: [
        {
          lift: 'squat', sets: 1, reps: [2, 5], repAnchor: 3, quality: 'strength',
          pct: null, rpeTarget: null, weight: 120, autoregulate: true,
          scheme: {
            type: 'straight',
            evidenceTier: 'rct',
            sets: [
              { weight: 120, reps: 3, rpe: 6 },
            ],
          },
        },
      ], accessories: [] },
    ] },
  ],
}

describe('planToCsv', () => {
  it('emits the new header with 세트번호 and 비고', () => {
    const csv = planToCsv(plan)
    const lines = csv.trim().split('\n')
    expect(lines[0]).toBe('주차,디로드,일차,종목,목표,세트번호,중량(kg),반복,RPE,비고')
  })
  it('emits one row per set (3 sets total across two exercises)', () => {
    const csv = planToCsv(plan)
    const lines = csv.trim().split('\n')
    // header + 2 sets from week 1 + 1 set from week 4 = 4 lines total
    expect(lines.length).toBe(4)
  })
  it('first set row has correct values', () => {
    const csv = planToCsv(plan)
    const lines = csv.trim().split('\n')
    expect(lines[1]).toBe('1,아니오,1,스쿼트,근력,1,162.5,3,9,')
  })
  it('second set row has correct values', () => {
    const csv = planToCsv(plan)
    const lines = csv.trim().split('\n')
    expect(lines[2]).toBe('1,아니오,1,스쿼트,근력,2,142.5,5,8,')
  })
  it('deload set row has correct values', () => {
    const csv = planToCsv(plan)
    const lines = csv.trim().split('\n')
    expect(lines[3]).toBe('4,예,1,스쿼트,근력,1,120,3,6,')
  })
  it('converts weights + header to lbs when requested', () => {
    const lines = planToCsv(plan, 'lbs').trim().split('\n')
    expect(lines[0]).toContain('중량(lbs)')
    expect(lines[1]).toBe('1,아니오,1,스쿼트,근력,1,360,3,9,')   // 162.5kg → 358.25 → round5 360
  })
  it('emits accessory rows with 체감 load', () => {
    const withAcc = {
      template: 'dup',
      weeks: [{ index: 1, isDeload: false, sessions: [
        { day: 1, exercises: [], accessories: [
          { name: 'leg press', quality: 'hypertrophy', scheme: { type: 'straight', evidenceTier: 'rct', sets: [{ reps: 10, rpe: 8 }, { reps: 10, rpe: 8 }] } },
        ] },
      ] }],
    }
    const lines = planToCsv(withAcc).trim().split('\n')
    expect(lines.length).toBe(3) // header + 2 accessory sets
    expect(lines[1]).toBe('1,아니오,1,레그 프레스,근비대,1,체감,10,8,')
  })
})
