import React from 'react'
import { useProfileStore, selectIsValid } from '../store/profileStore.js'
import { liftLabel, goalLabel, injuryLabel, equipmentLabel } from '../i18n.js'

const INJURIES = ['knee', 'shoulder', 'back']
const EQUIPMENT = ['barbell', 'rack', 'bench', 'box', 'trap bar', 'dumbbells', 'leg press machine']

function numberOrNull(v) {
  const n = parseFloat(v)
  return Number.isNaN(n) ? null : n
}

export default function InputForm({ onGenerate }) {
  const profile = useProfileStore((s) => s.profile)
  const setField = useProfileStore((s) => s.setField)
  const setLift = useProfileStore((s) => s.setLift)
  const toggleInjury = useProfileStore((s) => s.toggleInjury)
  const toggleEquipment = useProfileStore((s) => s.toggleEquipment)
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

      <label>목표
        <select value={profile.goal} onChange={(e) => setField('goal', e.target.value)}>
          <option value="strength">{goalLabel('strength')}</option>
          <option value="hypertrophy">{goalLabel('hypertrophy')}</option>
          <option value="balanced">{goalLabel('balanced')}</option>
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
        <legend>부상 부위</legend>
        {INJURIES.map((inj) => (
          <label key={inj}>
            <input type="checkbox" checked={profile.injuries.includes(inj)}
              onChange={() => toggleInjury(inj)} />
            {injuryLabel(inj)}
          </label>
        ))}
      </fieldset>

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

      <button type="button" disabled={!valid} onClick={onGenerate}>루틴 생성</button>
    </form>
  )
}
