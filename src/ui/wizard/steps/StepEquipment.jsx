import React from 'react'
import { useProfileStore } from '../../store/profileStore.js'
import { regionLabel, statusLabel } from '../../i18n.js'

export default function StepEquipment() {
  const p = useProfileStore((s) => s.profile)
  const setField = useProfileStore((s) => s.setField)
  const setRegionStatus = useProfileStore((s) => s.setRegionStatus)
  const setFrequency = useProfileStore((s) => s.setFrequency)

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
          min="0"
          value={p.sessionTimeLimit ?? ''}
          onChange={(e) => {
            const n = parseFloat(e.target.value)
            setField('sessionTimeLimit', Number.isNaN(n) ? null : n)
          }}
        />
      </label>

      <label>보조운동 선호
        <select value={p.accessoryPreference} onChange={(e) => setField('accessoryPreference', e.target.value)}>
          <option value="machine">머신 선호</option>
          <option value="free">프리웨이트 선호</option>
          <option value="any">무관</option>
        </select>
      </label>

      <fieldset>
        <legend>종목별 주 빈도 (0 = 제외)</legend>
        {[['squat','스쿼트'],['bench','벤치'],['deadlift','데드리프트']].map(([lift, ko]) => (
          <label key={lift}>{ko} 주 빈도
            <select value={p.frequency[lift]} onChange={(e) => setFrequency(lift, Number(e.target.value))}>
              {Array.from({ length: p.daysPerWeek + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        ))}
      </fieldset>

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
