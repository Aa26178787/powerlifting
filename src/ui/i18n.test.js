import { describe, it, expect } from 'vitest'
import db from '../data/exercises.json' with { type: 'json' }
import { regionLabel, statusLabel, styleLabel, liftLabel, qualityLabel, presetLabel, modelLabel, stepLabel, assessLabel, schemeLabel, evidenceLabel, phaseLabel, cueLabel, templateLabel, restLabel, exerciseName } from './i18n.js'

describe('i18n v2 helpers', () => {
  it('region labels', () => {
    expect(regionLabel('lowerBack')).toBe('허리')
    expect(regionLabel('bicepsTendon')).toBe('이두건')
  })
  it('status labels', () => {
    expect(statusLabel(0)).toBe('정상')
    expect(statusLabel(3)).toBe('심한 통증/부상')
  })
  it('style labels', () => {
    expect(styleLabel('bar', 'low')).toBe('로우바')
    expect(styleLabel('stance', 'sumo')).toBe('스모')
  })
  it('liftLabel falls back to the raw name for un-mapped exercises', () => {
    expect(liftLabel('Sumo Block Pull')).toBe('Sumo Block Pull')
  })
})

describe('i18n v3', () => {
  it('quality labels', () => {
    expect(qualityLabel('hypertrophy')).toBe('근비대')
    expect(qualityLabel('power')).toBe('파워')
  })
  it('preset + model labels', () => {
    expect(presetLabel('powerbuilding')).toBe('파워빌딩')
    expect(modelLabel('block')).toBe('블록')
    expect(modelLabel('auto')).toBe('자동 추천')
  })
})

describe('i18n sp2', () => {
  it('step labels', () => { expect(stepLabel(2)).toBe('현재 1RM'); expect(stepLabel(8)).toBe('요약') })
  it('assess labels', () => { expect(assessLabel('weakLift')).toBe('약점 종목'); expect(assessLabel('gl')).toBe('GL 점수') })
})

describe('templateLabel', () => {
  it('maps custom to a Korean label, not the raw id', () => {
    expect(templateLabel('custom')).not.toBe('custom')
    expect(templateLabel('custom')).toMatch(/맞춤/)
  })
})

describe('i18n Task 10: scheme/tool/phase/evidence labels', () => {
  it('schemeLabel', () => {
    expect(schemeLabel('topSetBackoff')).toBe('탑세트+백오프')
    expect(schemeLabel('strengthHypertrophy')).not.toBe('strengthHypertrophy')
    expect(schemeLabel('unknown')).toBe('unknown')
  })
  it('cueLabel', () => {
    expect(cueLabel('legDrive')).toBe('지면 누르는 느낌(레그 드라이브)')
    expect(cueLabel('unknown')).toBe('unknown')
  })
  it('evidenceLabel', () => {
    expect(evidenceLabel('rct')).toBe('검증')
    expect(evidenceLabel('consensus')).toBe('근거 약함')
    expect(evidenceLabel('unknown')).toBe('unknown')
  })
  it('phaseLabel', () => {
    expect(phaseLabel('peak')).toBe('피킹')
    expect(phaseLabel('unknown')).toBe('unknown')
  })
})

// ── exerciseName coverage guard ───────────────────────────────────────────────
describe('exerciseName: EXERCISE_NAME coverage guard', () => {
  it('every DB exercise name has an explicit Korean entry (no English fallthrough)', () => {
    const untranslated = []
    for (const ex of db.exercises) {
      // The map must contain the key directly — LIFT fallback is intentionally
      // reserved for comp-lift enums ('squat'/'bench'/'deadlift') not DB names.
      if (typeof exerciseName(ex.name) !== 'string' || exerciseName(ex.name) === ex.name) {
        untranslated.push(ex.name)
      }
    }
    if (untranslated.length > 0) console.error('Untranslated exercise names:', untranslated)
    expect(untranslated).toHaveLength(0)
  })

  it('total DB exercises is 205 (guard against silent additions)', () => {
    expect(db.exercises.length).toBe(205)
  })
})

describe('exerciseName: representative mappings', () => {
  it('comp lift enums localise via LIFT fallback', () => {
    expect(exerciseName('squat')).toBe('스쿼트')
    expect(exerciseName('bench')).toBe('벤치프레스')
    expect(exerciseName('deadlift')).toBe('데드리프트')
  })
  it('title-case DB names (comp entries) map directly', () => {
    expect(exerciseName('Conventional Deadlift')).toBe('컨벤셔널 데드리프트')
    expect(exerciseName('Bench Press (Competition Grip)')).toBe('벤치프레스 (경기 그립)')
    expect(exerciseName('Back Squat (Low Bar)')).toBe('백 스쿼트 (로우바)')
  })
  it('parenthetical qualifiers are translated', () => {
    expect(exerciseName('Good Morning (narrow)')).toBe('굿모닝 (내로우)')
    expect(exerciseName('Pause Squat (bottom)')).toBe('포즈 스쿼트 (바닥)')
    expect(exerciseName('Box Squat (above parallel)')).toBe('박스 스쿼트 (평행 위)')
    expect(exerciseName('Pause Deadlift (below knee)')).toBe('포즈 데드리프트 (무릎 아래)')
  })
  it('accessory names with equipment transliterations', () => {
    expect(exerciseName('Trap Bar Deadlift (high handles)')).toBe('트랩바 데드리프트 (높은 핸들)')
    expect(exerciseName('Dumbbell Bench Press')).toBe('덤벨 벤치프레스')
    expect(exerciseName('Cable Curl')).toBe('케이블 컬')
    expect(exerciseName('Leg Press')).toBe('레그 프레스')
  })
  it('unknown key falls through to raw string (no crash)', () => {
    expect(exerciseName('Unknown Exercise XYZ')).toBe('Unknown Exercise XYZ')
  })
  it('legacy lowercase LIFT keys still work via fallback (backward compat)', () => {
    expect(exerciseName('leg press')).toBe('레그 프레스')
    expect(exerciseName('romanian deadlift')).toBe('루마니안 데드리프트')
  })
})

describe('restLabel', () => {
  it('power and strength → 3–5분', () => {
    expect(restLabel('power')).toBe('3–5분')
    expect(restLabel('strength')).toBe('3–5분')
  })
  it('hypertrophy → 1–2분', () => expect(restLabel('hypertrophy')).toBe('1–2분'))
  it('endurance → 1분', () => expect(restLabel('endurance')).toBe('1분'))
  it('unknown quality → empty string', () => expect(restLabel('unknown')).toBe(''))
})
