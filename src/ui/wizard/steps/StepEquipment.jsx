import React from 'react'
import { useProfileStore } from '../../store/profileStore.js'
import { regionLabel, statusLabel, VOL, WEEKDAYS, sortWeekdays } from '../../i18n.js'
import { volumeWarnings } from '../../../engine/volumeOverride.js'
import VolumeWarnings from '../../components/VolumeWarnings.jsx'

export default function StepEquipment() {
  const p = useProfileStore((s) => s.profile)
  const setField = useProfileStore((s) => s.setField)
  const setRegionStatus = useProfileStore((s) => s.setRegionStatus)
  const setFrequency = useProfileStore((s) => s.setFrequency)
  const setVolumeOverrideEnabled = useProfileStore((s) => s.setVolumeOverrideEnabled)
  const setMainVolumeMode = useProfileStore((s) => s.setMainVolumeMode)
  const setMainSetsPerSession = useProfileStore((s) => s.setMainSetsPerSession)
  const setAccessorySetsPerSession = useProfileStore((s) => s.setAccessorySetsPerSession)
  const applyVolumeRecommendation = useProfileStore((s) => s.applyVolumeRecommendation)
  const clearVolumeOverride = useProfileStore((s) => s.clearVolumeOverride)

  const ov = p.volumeOverride
  const warnings = volumeWarnings(p)

  return (
    <div>
      <label>주당 훈련일
        <select
          value={p.daysPerWeek}
          onChange={(e) => { setField('daysPerWeek', Number(e.target.value)); setField('trainingDays', []) }}
        >
          {[3, 4, 5, 6].map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>

      <fieldset>
        <legend>운동 요일 (선택 — 지정 시 훈련일수 자동)</legend>
        {WEEKDAYS.map((d) => (
          <label key={d.key}>
            <input
              type="checkbox"
              checked={(p.trainingDays ?? []).includes(d.key)}
              onChange={() => {
                const cur = p.trainingDays ?? []
                const next = sortWeekdays(cur.includes(d.key) ? cur.filter((k) => k !== d.key) : [...cur, d.key])
                setField('trainingDays', next)
                if (next.length >= 1) setField('daysPerWeek', next.length)
              }}
            />
            {' '}{d.short}
          </label>
        ))}
        {(p.trainingDays ?? []).length > 0 && (
          <p style={{ fontSize: '0.85em', color: '#888', margin: '4px 0 0' }}>
            선택 {p.trainingDays.length}일 → 주당 훈련일 {p.daysPerWeek}일. 루틴 세션이 이 요일에 배정됩니다.
          </p>
        )}
      </fieldset>

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

      <details className="volume-advanced">
        <summary>{VOL.title}</summary>
        <p style={{ fontSize: '0.9em', color: '#888' }}>{VOL.disclaimer}</p>

        <label>
          <input
            type="checkbox"
            checked={ov.main.enabled}
            onChange={(e) => setVolumeOverrideEnabled('main', e.target.checked)}
          />
          {' '}{VOL.mainEnable}
        </label>

        {ov.main.enabled && (
          <div>
            <div role="radiogroup" aria-label="볼륨 모드">
              <label>
                <input
                  type="radio"
                  name="volumeMode"
                  value="rampFromFloor"
                  checked={ov.main.mode === 'rampFromFloor'}
                  onChange={() => setMainVolumeMode('rampFromFloor')}
                />
                {' '}{VOL.mode_rampFromFloor}
              </label>
              {' '}
              <label>
                <input
                  type="radio"
                  name="volumeMode"
                  value="fixed"
                  checked={ov.main.mode === 'fixed'}
                  onChange={() => setMainVolumeMode('fixed')}
                />
                {' '}{VOL.mode_fixed}
              </label>
            </div>

            {[['squat', '스쿼트'], ['bench', '벤치'], ['deadlift', '데드리프트']].map(([lift, ko]) => {
              const freq = p.frequency[lift] ?? 0
              const sps = ov.main.setsPerSession[lift]
              const weekly = sps != null && freq > 0 ? sps * freq : null
              return (
                <div key={lift} style={{ display: 'flex', alignItems: 'center', gap: '0.5em', margin: '0.25em 0' }}>
                  <label style={{ minWidth: '6em' }}>{ko} {VOL.setsPerSession}
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={sps ?? ''}
                      disabled={freq === 0}
                      aria-label={`${ko} ${VOL.setsPerSession}`}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10)
                        setMainSetsPerSession(lift, Number.isNaN(n) ? null : n)
                      }}
                      onBlur={(e) => {
                        const n = parseInt(e.target.value, 10)
                        if (!Number.isNaN(n)) setMainSetsPerSession(lift, n)
                      }}
                      style={{ width: '4em', marginLeft: '0.3em' }}
                    />
                  </label>
                  {freq > 0
                    ? <span aria-label={`${ko} 주간 세트`}>× {freq} = {weekly ?? '—'} {VOL.weekly}</span>
                    : <span style={{ color: '#aaa' }}>({VOL.freqZeroHint})</span>
                  }
                  {freq > 0 && (
                    <label style={{ marginLeft: '0.5em' }}>{VOL.weekly} 직접입력
                      <input
                        type="number"
                        min="1"
                        max={12 * freq}
                        value={weekly ?? ''}
                        disabled={freq === 0}
                        aria-label={`${ko} 주간 직접입력`}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10)
                          if (!Number.isNaN(n) && freq > 0) setMainSetsPerSession(lift, Math.round(n / freq))
                        }}
                        style={{ width: '4em', marginLeft: '0.3em' }}
                      />
                    </label>
                  )}
                </div>
              )
            })}

            <label>
              <input
                type="checkbox"
                checked={ov.accessory.enabled}
                onChange={(e) => setVolumeOverrideEnabled('accessory', e.target.checked)}
              />
              {' '}{VOL.accessoryEnable}
            </label>

            {ov.accessory.enabled && (
              <label style={{ marginLeft: '1em' }}>{VOL.accessoryLabel}
                <input
                  type="number"
                  min="0"
                  max="8"
                  value={ov.accessory.setsPerSession ?? ''}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10)
                    setAccessorySetsPerSession(Number.isNaN(n) ? null : n)
                  }}
                  style={{ width: '4em', marginLeft: '0.3em' }}
                />
              </label>
            )}
            <p style={{ fontSize: '0.85em', color: '#888', margin: '0.25em 0' }}>{VOL.timeWarning}</p>
          </div>
        )}

        <div style={{ margin: '0.5em 0' }}>
          <button type="button" onClick={applyVolumeRecommendation}>
            {VOL.autoRecommend}
          </button>
          {' '}
          <button type="button" onClick={clearVolumeOverride}>
            {VOL.clearAuto}
          </button>
        </div>

        <VolumeWarnings list={warnings} />
      </details>

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
