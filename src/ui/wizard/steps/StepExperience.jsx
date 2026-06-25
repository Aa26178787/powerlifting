import React from 'react'
import { useProfileStore } from '../../store/profileStore.js'
const numOrNull = (v) => { const n = parseFloat(v); return Number.isNaN(n) ? null : n }
export default function StepExperience() {
  const p = useProfileStore((s) => s.profile)
  const setField = useProfileStore((s) => s.setField)
  return (
    <label>운동 경력 (년)
      <input type="number" step="0.5" value={p.years} onChange={(e) => setField('years', numOrNull(e.target.value))} />
    </label>
  )
}
