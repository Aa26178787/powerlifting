import { describe, it, expect } from 'vitest'
import { regionLabel, statusLabel, styleLabel, liftLabel, qualityLabel, presetLabel, modelLabel, stepLabel, assessLabel } from './i18n.js'

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
