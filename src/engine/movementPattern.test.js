import { describe, it, expect } from 'vitest'
import { displayPatternLabel, patternOf } from './movementPattern.js'
import { byName } from './exercises.js'

const label = (name) => displayPatternLabel(byName(name))

describe('displayPatternLabel — pull split into vertical / horizontal', () => {
  it('vertical pulls (pulldown / pull-up / pullover) → 수직 당기기', () => {
    expect(label('Lat Pulldown (wide)')).toBe('수직 당기기')
    expect(label('Pull-Up (wide)')).toBe('수직 당기기')
    expect(label('Chin-Up (underhand)')).toBe('수직 당기기')
    expect(label('Cable Pullover')).toBe('수직 당기기')
    expect(label('Straight-Arm Pulldown')).toBe('수직 당기기')
  })
  it('horizontal pulls (rows / face pull / shrug / rear delt) → 수평 당기기', () => {
    expect(label('Pendlay Row')).toBe('수평 당기기')
    expect(label('Barbell Bent-Over Row (overhand)')).toBe('수평 당기기')
    expect(label('Face Pull')).toBe('수평 당기기')
    expect(label('Barbell Shrug')).toBe('수평 당기기')
    expect(label('Rear Delt Fly')).toBe('수평 당기기')
  })
})

describe('displayPatternLabel — non-pull families keep their coarse label', () => {
  it('push / hinge / knee / arms / core', () => {
    expect(label('Machine Chest Press')).toBe('밀기 (가슴)')
    expect(label('Lateral Raise (DB)')).toBe('밀기 (어깨)')
    expect(label('Romanian Deadlift (RDL)')).toBe('힌지 / 후면사슬')
    expect(label('Leg Extension')).toBe('스쿼트 / 무릎')
    expect(label('Barbell Curl')).toBe('팔 (이두)')
    expect(label('Triceps Pushdown (rope)')).toBe('팔 (삼두)')
    expect(label('Plank')).toBe('코어')
    expect(label('Wrist Curl')).toBe('전완 / 그립')
  })
  it('unknown / missing muscle → 기타 (never throws)', () => {
    expect(displayPatternLabel({ name: 'Mystery', primaryMuscle: '' })).toBe('기타')
    expect(displayPatternLabel(undefined)).toBe('기타')
    expect(patternOf(undefined)).toBe('other')
  })
})
