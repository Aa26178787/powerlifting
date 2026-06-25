import React from 'react'
import { useProfileStore } from '../../store/profileStore.js'
import { recommendModel } from '../../../engine/periodizationModel.js'
import { modelLabel, qualityLabel } from '../../i18n.js'
import StrengthAssessment from '../StrengthAssessment.jsx'

export default function StepSummary() {
  const p = useProfileStore((s) => s.profile)
  const oneRMs = {
    squat: p.lifts.squat?.oneRM ?? 0,
    bench: p.lifts.bench?.oneRM ?? 0,
    deadlift: p.lifts.deadlift?.oneRM ?? 0,
  }

  const resolvedModel =
    p.periodizationModel === 'auto'
      ? recommendModel({ competition: p.competition, blend: p.qualities })
      : p.periodizationModel

  return (
    <div>
      <StrengthAssessment oneRMs={oneRMs} bodyweight={p.bodyweight} sex={p.sex} />

      <p>선택된 주기화 모델: <strong>{modelLabel(resolvedModel)}</strong></p>

      <fieldset>
        <legend>목표 배분</legend>
        {['power', 'strength', 'hypertrophy', 'endurance'].map((q) => (
          <p key={q}>{qualityLabel(q)}: {Math.round(p.qualities[q] * 100)}%</p>
        ))}
      </fieldset>
    </div>
  )
}
