import React from 'react'
import { useProfileStore } from '../../store/profileStore.js'
const numOrNull = (v) => { const n = parseFloat(v); return Number.isNaN(n) ? null : n }
export default function StepBasics() {
  const p = useProfileStore((s) => s.profile)
  const setField = useProfileStore((s) => s.setField)
  return (
    <div>
      <label>성별
        <select value={p.sex} onChange={(e) => setField('sex', e.target.value)}>
          <option value="">—</option><option value="M">남</option><option value="F">여</option>
        </select>
      </label>
      <label>체중 (kg)
        <input type="number" value={p.bodyweight ?? ''} onChange={(e) => setField('bodyweight', numOrNull(e.target.value))} />
      </label>
      <label>나이
        <input type="number" value={p.age ?? ''} onChange={(e) => setField('age', numOrNull(e.target.value))} />
      </label>
    </div>
  )
}
