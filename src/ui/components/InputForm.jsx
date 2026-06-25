import React from 'react'
import { useProfileStore, selectIsValid } from '../store/profileStore.js'
import { liftLabel, equipmentLabel, styleLabel, regionLabel, statusLabel, qualityLabel, presetLabel, modelLabel } from '../i18n.js'

const EQUIPMENT = ['barbell', 'rack', 'bench', 'box', 'trap bar', 'dumbbells', 'leg press machine']

function numberOrNull(v) {
  const n = parseFloat(v)
  return Number.isNaN(n) ? null : n
}

export default function InputForm({ onGenerate }) {
  const profile = useProfileStore((s) => s.profile)
  const setField = useProfileStore((s) => s.setField)
  const setLift = useProfileStore((s) => s.setLift)
  const setStyle = useProfileStore((s) => s.setStyle)
  const setStickingPoint = useProfileStore((s) => s.setStickingPoint)
  const setRegionStatus = useProfileStore((s) => s.setRegionStatus)
  const toggleEquipment = useProfileStore((s) => s.toggleEquipment)
  const setQuality = useProfileStore((s) => s.setQuality)
  const applyPreset = useProfileStore((s) => s.applyPreset)
  const setPeriodizationModel = useProfileStore((s) => s.setPeriodizationModel)
  const valid = selectIsValid(profile)

  const setOneRM = (lift, v) => setLift(lift, { oneRM: numberOrNull(v) })

  return (
    <form className="input-form" onSubmit={(e) => e.preventDefault()}>
      <fieldset>
        <legend>현재 1RM</legend>
        {['squat', 'bench', 'deadlift'].map((lift) => (
          <label key={lift}>
            {liftLabel(lift)} 1RM
            <input
              type="number"
              value={profile.lifts[lift]?.oneRM ?? ''}
              onChange={(e) => setOneRM(lift, e.target.value)}
            />
          </label>
        ))}
      </fieldset>

      <label>운동 경력 (년)
        <input type="number" step="0.5" value={profile.years}
          onChange={(e) => setField('years', numberOrNull(e.target.value))} />
      </label>

      <label>주당 훈련일
        <select value={profile.daysPerWeek}
          onChange={(e) => setField('daysPerWeek', Number(e.target.value))}>
          {[3, 4, 5, 6].map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>

      <fieldset>
        <legend>목표 (프리셋)</legend>
        {['powerlifting','powerbuilding','bodybuilding','athletic','general'].map((k) => (
          <button type="button" key={k} onClick={() => applyPreset(k)}>{presetLabel(k)}</button>
        ))}
      </fieldset>

      <fieldset>
        <legend>목표 배분</legend>
        {['power','strength','hypertrophy','endurance'].map((q) => (
          <label key={q}>{qualityLabel(q)}
            <input type="range" min="0" max="1" step="0.05" value={profile.qualities[q]}
              onChange={(e) => setQuality(q, Number(e.target.value))} />
            <span>{Math.round(profile.qualities[q] * 100)}%</span>
          </label>
        ))}
      </fieldset>

      <label>주기화 모델
        <select value={profile.periodizationModel} onChange={(e) => setPeriodizationModel(e.target.value)}>
          {['auto','linear','undulating','block'].map((m) => <option key={m} value={m}>{modelLabel(m)}</option>)}
        </select>
      </label>

      <label>컨디션 (1: 쌩쌩함 ~ 5: 매우 지침)
        <input type="range" min="1" max="5" value={profile.fatigue}
          onChange={(e) => setField('fatigue', Number(e.target.value))} />
        <span>{profile.fatigue}</span>
      </label>

      <label>
        <input type="checkbox" checked={profile.competition.on}
          onChange={(e) => setField('competition', { ...profile.competition, on: e.target.checked })} />
        대회 모드
      </label>
      {profile.competition.on && (
        <label>대회 날짜
          <input type="date" value={profile.competition.date}
            onChange={(e) => setField('competition', { ...profile.competition, date: e.target.value })} />
        </label>
      )}

      <label>나이
        <input type="number" value={profile.age ?? ''}
          onChange={(e) => setField('age', numberOrNull(e.target.value))} />
      </label>
      <label>체중 (kg)
        <input type="number" value={profile.bodyweight ?? ''}
          onChange={(e) => setField('bodyweight', numberOrNull(e.target.value))} />
      </label>
      <label>성별
        <select value={profile.sex} onChange={(e) => setField('sex', e.target.value)}>
          <option value="">—</option><option value="M">남</option><option value="F">여</option>
        </select>
      </label>
      <label>집중 보강할 약점 종목
        <select value={profile.weakLift} onChange={(e) => setField('weakLift', e.target.value)}>
          <option value="">없음</option>
          <option value="squat">{liftLabel('squat')}</option>
          <option value="bench">{liftLabel('bench')}</option>
          <option value="deadlift">{liftLabel('deadlift')}</option>
        </select>
      </label>
      <label>1회 운동 시간 제한 (분)
        <input type="number" value={profile.sessionTimeLimit ?? ''}
          onChange={(e) => setField('sessionTimeLimit', numberOrNull(e.target.value))} />
      </label>

      <fieldset>
        <legend>보유 장비</legend>
        {EQUIPMENT.map((eq) => (
          <label key={eq}>
            <input type="checkbox" checked={profile.equipment.includes(eq)}
              onChange={() => toggleEquipment(eq)} />
            {equipmentLabel(eq)}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>스타일</legend>
        <label>스쿼트 바
          <select value={profile.style.squat.bar} onChange={(e) => setStyle('squat', { bar: e.target.value })}>
            <option value="low">{styleLabel('bar','low')}</option>
            <option value="high">{styleLabel('bar','high')}</option>
          </select>
        </label>
        <label>스쿼트 스탠스
          <select value={profile.style.squat.stance} onChange={(e) => setStyle('squat', { stance: e.target.value })}>
            {['narrow','medium','wide'].map((v) => <option key={v} value={v}>{styleLabel('stance',v)}</option>)}
          </select>
        </label>
        <label>벤치 그립
          <select value={profile.style.bench.grip} onChange={(e) => setStyle('bench', { grip: e.target.value })}>
            {['close','medium','wide'].map((v) => <option key={v} value={v}>{styleLabel('grip',v)}</option>)}
          </select>
        </label>
        <label>데드리프트 스탠스
          <select value={profile.style.deadlift.stance} onChange={(e) => setStyle('deadlift', { stance: e.target.value })}>
            {['conventional','sumo'].map((v) => <option key={v} value={v}>{styleLabel('stance',v)}</option>)}
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend>스티킹포인트 (가장 안 올라가는 구간)</legend>
        {['squat','bench','deadlift'].map((lift) => (
          <label key={lift}>{liftLabel(lift)}
            <select value={profile.stickingPoint[lift]} onChange={(e) => setStickingPoint(lift, e.target.value)}>
              {['none','bottom','midrange','lockout'].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>부위 상태 (0 정상 ~ 3 심한 통증/부상)</legend>
        {Object.keys(profile.regionStatus).map((region) => (
          <label key={region}>{regionLabel(region)} 상태
            <select value={profile.regionStatus[region]} onChange={(e) => setRegionStatus(region, Number(e.target.value))}>
              {[0,1,2,3].map((n) => <option key={n} value={n}>{statusLabel(n)}</option>)}
            </select>
          </label>
        ))}
      </fieldset>

      <button type="button" disabled={!valid} onClick={onGenerate}>루틴 생성</button>
    </form>
  )
}
