import React from 'react'
import { useProfileStore } from '../../store/profileStore.js'
import { recommendModel } from '../../../engine/periodizationModel.js'
import { modelLabel } from '../../i18n.js'

export default function StepPeriodization() {
  const p = useProfileStore((s) => s.profile)
  const setField = useProfileStore((s) => s.setField)
  const setPeriodizationModel = useProfileStore((s) => s.setPeriodizationModel)

  const rec = recommendModel({ competition: p.competition, blend: p.qualities })

  return (
    <div>
      <label htmlFor="periodization-model">주기화 모델
        <select
          id="periodization-model"
          value={p.periodizationModel}
          onChange={(e) => setPeriodizationModel(e.target.value)}
        >
          {['auto', 'linear', 'undulating', 'block'].map((m) => (
            <option key={m} value={m}>{modelLabel(m)}</option>
          ))}
        </select>
      </label>
      {p.periodizationModel === 'auto' && (
        <p>추천 모델: <strong>{modelLabel(rec)}</strong></p>
      )}

      <label>
        <input
          type="checkbox"
          checked={p.competition.on}
          onChange={(e) => setField('competition', { ...p.competition, on: e.target.checked })}
        />
        대회 모드
      </label>
      {p.competition.on && (
        <label>대회 날짜
          <input
            type="date"
            value={p.competition.date}
            onChange={(e) => setField('competition', { ...p.competition, date: e.target.value })}
          />
        </label>
      )}
    </div>
  )
}
