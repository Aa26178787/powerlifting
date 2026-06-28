import { describe, it, expect } from 'vitest'
import { regionLabel, statusLabel, styleLabel, liftLabel, qualityLabel, presetLabel, modelLabel, stepLabel, assessLabel, schemeLabel, evidenceLabel, phaseLabel, cueLabel, templateLabel, restLabel } from './i18n.js'

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

describe('restLabel', () => {
  it('power and strength → 3–5분', () => {
    expect(restLabel('power')).toBe('3–5분')
    expect(restLabel('strength')).toBe('3–5분')
  })
  it('hypertrophy → 1–2분', () => expect(restLabel('hypertrophy')).toBe('1–2분'))
  it('endurance → 1분', () => expect(restLabel('endurance')).toBe('1분'))
  it('unknown quality → empty string', () => expect(restLabel('unknown')).toBe(''))
})
