import React from 'react'
import { useProfileStore } from '../../store/profileStore.js'
import { regionLabel, statusLabel, VOL, WEEKDAYS, sortWeekdays } from '../../i18n.js'
import { volumeWarnings } from '../../../engine/volumeOverride.js'
import { allEquipment } from '../../../engine/exercises.js'
import { STREET_LIFTS } from '../../../engine/streetLifting.js'
import { toDisplay, fromInput, unitLabel } from '../../lib/units.js'
import VolumeWarnings from '../../components/VolumeWarnings.jsx'

// Base equipment = the default barbell gym. "Full gym" expands auto-selection to the
// whole DB (machine/cable/dumbbell/pull-up accessories). Default OFF keeps the
// generated plan byte-identical to prior versions.
const BASE_EQUIP = ['barbell', 'rack', 'bench']
const FULL_EQUIP = allEquipment()

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
  const setStreetEnabled = useProfileStore((s) => s.setStreetEnabled)
  const setStreetPlacement = useProfileStore((s) => s.setStreetPlacement)
  const setStreetLift = useProfileStore((s) => s.setStreetLift)
  const setStreetK = useProfileStore((s) => s.setStreetK)
  const setStreetFrequency = useProfileStore((s) => s.setStreetFrequency)

  const ov = p.volumeOverride
  const warnings = volumeWarnings(p)
  const u = p.units ?? 'kg'
  const street = p.streetLifting

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

      <label title="머신·케이블·덤벨·풀업바 등 모든 장비를 사용한다고 가정해 보조운동 종목을 더 다양하게 자동 선택합니다. 끄면 바벨·랙·벤치 기준입니다.">
        <input
          type="checkbox"
          checked={(p.equipment ?? BASE_EQUIP).length > BASE_EQUIP.length}
          onChange={(e) => setField('equipment', e.target.checked ? [...FULL_EQUIP] : [...BASE_EQUIP])}
        />
        {' '}헬스장 전체 장비 사용 (풀짐 — 보조운동 다양화)
      </label>
      <p style={{ fontSize: '0.85em', color: '#888', margin: '2px 0 0' }}>
        끄면 바벨·랙·벤치 기준으로 보조운동을 고릅니다. 켜면 머신·케이블·덤벨 등을 포함해 더 다양하게 추천합니다.
        (개별 보조운동은 루틴에서 '변경' 버튼으로 항상 전체 목록에서 직접 고를 수 있습니다.)
      </p>

      <details className="street-advanced">
        <summary>스트리트 리프팅 (가중 딥스 · 풀업/친업) — 선택</summary>
        <p style={{ fontSize: '0.85em', color: '#888' }}>
          체중 기반 종목을 추가중량으로 점진하는 보조 트랙입니다(정식 메인 리프트 아님). 체중 입력이 필요합니다.
        </p>
        <label>
          <input type="checkbox" checked={street.enabled} onChange={(e) => setStreetEnabled(e.target.checked)} />
          {' '}스트리트 리프팅 사용
        </label>
        {street.enabled && (
          <div>
            {!p.bodyweight && (
              <p style={{ color: '#b00', fontSize: '0.85em' }}>⚠ 1단계에서 체중을 입력해야 무게가 계산됩니다.</p>
            )}
            <label>배치 방식
              <select value={street.placement ?? 'block'} onChange={(e) => setStreetPlacement(e.target.value)}>
                <option value="block">별도 블록 (주 단위 · 원하는 날 직접 끼워넣기)</option>
                <option value="integrated">세션 통합 (딥→벤치 날, 풀업→데드 날 자동 배치)</option>
              </select>
            </label>
            {STREET_LIFTS.map((def) => {
              const cfg = street[def.key]
              return (
                <fieldset key={def.key}>
                  <legend>{def.label}</legend>
                  <label>최대 테스트 추가중량 ({unitLabel(u)})
                    <input type="number" min="0" value={cfg.added == null ? '' : toDisplay(cfg.added, u, false)}
                      onChange={(e) => setStreetLift(def.key, { added: fromInput(e.target.value, u) })}
                      style={{ width: '5em', marginLeft: '0.3em' }} />
                  </label>
                  <label>그 무게로 가능한 반복
                    <input type="number" min="1" max="12" value={cfg.reps ?? ''}
                      onChange={(e) => { const n = parseInt(e.target.value, 10); setStreetLift(def.key, { reps: Number.isNaN(n) ? null : n }) }}
                      style={{ width: '4em', marginLeft: '0.3em' }} />
                  </label>
                  <label>그때 RPE
                    <input type="number" min="6" max="10" step="0.5" value={cfg.rpe ?? ''}
                      onChange={(e) => { const n = parseFloat(e.target.value); setStreetLift(def.key, { rpe: Number.isNaN(n) ? null : n }) }}
                      style={{ width: '4em', marginLeft: '0.3em' }} />
                  </label>
                  {def.key === 'pullup' && (
                    <label>그립
                      <select value={cfg.grip ?? 'pronated'} onChange={(e) => setStreetLift(def.key, { grip: e.target.value })}>
                        <option value="pronated">오버핸드(풀업)</option>
                        <option value="neutral">뉴트럴</option>
                        <option value="supine">언더핸드(친업)</option>
                      </select>
                    </label>
                  )}
                  <label>주 빈도
                    <select value={street.frequency[def.key]} onChange={(e) => setStreetFrequency(def.key, Number(e.target.value))}>
                      {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <details>
                    <summary style={{ fontSize: '0.82em' }}>고급: 체중계수 k (추정값)</summary>
                    <label>k
                      <input type="number" min="0.5" max="1.2" step="0.01" value={street.k[def.key]}
                        onChange={(e) => setStreetK(def.key, e.target.value)}
                        style={{ width: '5em', marginLeft: '0.3em' }} />
                    </label>
                  </details>
                </fieldset>
              )
            })}
          </div>
        )}
      </details>

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
