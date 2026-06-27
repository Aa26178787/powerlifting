import React from 'react'
import { assess, relStandard } from '../../engine/standards.js'
import { liftLabel, assessLabel } from '../i18n.js'

const MAIN = ['squat', 'bench', 'deadlift']

export default function StrengthAssessment({ oneRMs, bodyweight, sex }) {
  if (!bodyweight) {
    return <p className="assess-placeholder">체중을 입력하면 강도 진단이 표시됩니다.</p>
  }

  const enteredLifts = MAIN.filter((l) => oneRMs[l] > 0)

  if (enteredLifts.length === 0) {
    return <p className="assess-placeholder">1RM을 입력하면 강도 진단이 표시됩니다.</p>
  }

  if (enteredLifts.length === MAIN.length) {
    const a = assess(oneRMs, bodyweight, sex)
    if (!a) return <p className="assess-placeholder">1RM과 체중을 입력하면 강도 진단이 표시됩니다.</p>
    return (
      <div className="assessment">
        {sex === '' && <p className="assess-sex-note">남성 기준 (성별 미입력)</p>}
        <p>{assessLabel('level')}: <strong>{a.level}</strong> · {assessLabel('gl')}: <strong>{a.glPoints}</strong></p>
        <ul>
          {MAIN.map((l) => (
            <li key={l} className={a.weakLift === l ? 'weak' : ''}>
              {liftLabel(l)} — {assessLabel('standard')} {Math.round(a.perLift[l] * 100)}%
              {a.weakLift === l ? ' ⚠️ ' + assessLabel('weakLift') : ''}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // Partial: bodyweight present, some 1RMs entered
  return (
    <div className="assessment assessment--partial">
      {sex === '' && <p className="assess-sex-note">남성 기준 (성별 미입력)</p>}
      <ul>
        {enteredLifts.map((l) => {
          const pct = relStandard(l, oneRMs[l], bodyweight, sex)
          return (
            <li key={l}>
              {liftLabel(l)} — {assessLabel('standard')} {Math.round(pct * 100)}%
            </li>
          )
        })}
      </ul>
      <p className="assess-placeholder">모든 종목을 입력하면 레벨과 GL 점수가 표시됩니다.</p>
    </div>
  )
}
