import React from 'react'
import { assess } from '../../engine/standards.js'
import { liftLabel, assessLabel } from '../i18n.js'

export default function StrengthAssessment({ oneRMs, bodyweight, sex }) {
  const a = assess(oneRMs, bodyweight, sex)
  if (!a) return <p className="assess-placeholder">1RM과 체중을 입력하면 강도 진단이 표시됩니다.</p>
  return (
    <div className="assessment">
      <p>{assessLabel('level')}: <strong>{a.level}</strong> · {assessLabel('gl')}: <strong>{a.glPoints}</strong></p>
      <ul>
        {['squat', 'bench', 'deadlift'].map((l) => (
          <li key={l} className={a.weakLift === l ? 'weak' : ''}>
            {liftLabel(l)} — {assessLabel('standard')} {Math.round(a.perLift[l] * 100)}%
            {a.weakLift === l ? ' ⚠️ ' + assessLabel('weakLift') : ''}
          </li>
        ))}
      </ul>
    </div>
  )
}
