import React from 'react'
import { useProfileStore } from '../../store/profileStore.js'
import { regionLabel, statusLabel } from '../../i18n.js'

export default function StepEquipment() {
  const p = useProfileStore((s) => s.profile)
  const setField = useProfileStore((s) => s.setField)
  const setRegionStatus = useProfileStore((s) => s.setRegionStatus)

  return (
    <div>
      <label>주당 훈련일
        <select value={p.daysPerWeek} onChange={(e) => setField('daysPerWeek', Number(e.target.value))}>
          {[3, 4, 5, 6].map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>

      <label>1회 운동 시간 제한 (분)
        <input
          type="number"
          value={p.sessionTimeLimit ?? ''}
          onChange={(e) => {
            const n = parseFloat(e.target.value)
            setField('sessionTimeLimit', Number.isNaN(n) ? null : n)
          }}
        />
      </label>

      <fieldset>
        <legend>부위 상태 (0 정상 ~ 3 심한 통증/부상)</legend>
        {Object.keys(p.regionStatus).map((region) => (
          <label key={region}>{regionLabel(region)} 상태
            <select
              value={p.regionStatus[region]}
              onChange={(e) => setRegionStatus(region, Number(e.target.value))}
            >
              {[0, 1, 2, 3].map((n) => (
                <option key={n} value={n}>{statusLabel(n)}</option>
              ))}
            </select>
          </label>
        ))}
      </fieldset>
    </div>
  )
}
