import React from 'react'
import { useProfileStore, selectIsValid } from '../store/profileStore.js'

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
        <legend>Current 1RM</legend>
        {['squat', 'bench', 'deadlift'].map((lift) => (
          <label key={lift}>
            {lift} 1RM
            <input
              type="number"
              value={profile.lifts[lift]?.oneRM ?? ''}
              onChange={(e) => setOneRM(lift, e.target.value)}
            />
          </label>
        ))}
      </fieldset>

      <label>Training years
        <input type="number" step="0.5" value={profile.years}
          onChange={(e) => setField('years', numberOrNull(e.target.value))} />
      </label>

      <label>Days per week
        <select value={profile.daysPerWeek}
          onChange={(e) => setField('daysPerWeek', Number(e.target.value))}>
          {[3, 4, 5, 6].map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>

      <label>Goal
        <select value={profile.goal} onChange={(e) => setField('goal', e.target.value)}>
          <option value="strength">strength</option>
          <option value="hypertrophy">hypertrophy</option>
          <option value="balanced">balanced</option>
        </select>
      </label>

      <label>Life fatigue (1 fresh – 5 wrecked)
        <input type="range" min="1" max="5" value={profile.fatigue}
          onChange={(e) => setField('fatigue', Number(e.target.value))} />
        <span>{profile.fatigue}</span>
      </label>

      <label>
        <input type="checkbox" checked={profile.competition.on}
          onChange={(e) => setField('competition', { ...profile.competition, on: e.target.checked })} />
        Competition mode
      </label>
      {profile.competition.on && (
        <label>Meet date
          <input type="date" value={profile.competition.date}
            onChange={(e) => setField('competition', { ...profile.competition, date: e.target.value })} />
        </label>
      )}

      <label>Age
        <input type="number" value={profile.age ?? ''}
          onChange={(e) => setField('age', numberOrNull(e.target.value))} />
      </label>
      <label>Bodyweight
        <input type="number" value={profile.bodyweight ?? ''}
          onChange={(e) => setField('bodyweight', numberOrNull(e.target.value))} />
      </label>
      <label>Sex
        <select value={profile.sex} onChange={(e) => setField('sex', e.target.value)}>
          <option value="">—</option><option value="M">M</option><option value="F">F</option>
        </select>
      </label>
      <label>Weak lift to prioritize
        <select value={profile.weakLift} onChange={(e) => setField('weakLift', e.target.value)}>
          <option value="">none</option>
          <option value="squat">squat</option>
          <option value="bench">bench</option>
          <option value="deadlift">deadlift</option>
        </select>
      </label>
      <label>Session time limit (min)
        <input type="number" value={profile.sessionTimeLimit ?? ''}
          onChange={(e) => setField('sessionTimeLimit', numberOrNull(e.target.value))} />
      </label>

      <fieldset>
        <legend>Injuries</legend>
        {INJURIES.map((inj) => (
          <label key={inj}>
            <input type="checkbox" checked={profile.injuries.includes(inj)}
              onChange={() => toggleInjury(inj)} />
            {inj}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Equipment</legend>
        {EQUIPMENT.map((eq) => (
          <label key={eq}>
            <input type="checkbox" checked={profile.equipment.includes(eq)}
              onChange={() => toggleEquipment(eq)} />
            {eq}
          </label>
        ))}
      </fieldset>

      <button type="button" disabled={!valid} onClick={onGenerate}>Generate routine</button>
    </form>
  )
}
