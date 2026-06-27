import React from 'react'
import { useProfileStore } from '../../store/profileStore.js'
import { toDisplay, fromInput, unitLabel } from '../../lib/units.js'
const numOrNull = (v) => { const n = parseFloat(v); return Number.isNaN(n) ? null : n }
export default function StepBasics() {
  const p = useProfileStore((s) => s.profile)
  const setField = useProfileStore((s) => s.setField)
  const setUnits = useProfileStore((s) => s.setUnits)
  const u = p.units ?? 'kg'
  return (
    <div>
      <label>단위
        <select value={u} onChange={(e) => setUnits(e.target.value)}>
          <option value="kg">kg</option><option value="lbs">lbs</option>
        </select>
      </label>
      <label>성별
        <select value={p.sex} onChange={(e) => setField('sex', e.target.value)}>
          <option value="">—</option><option value="M">남</option><option value="F">여</option>
        </select>
      </label>
      <label>체중 ({unitLabel(u)})
        <input type="number" min="0" max="400" value={p.bodyweight == null ? '' : toDisplay(p.bodyweight, u, false)} onChange={(e) => setField('bodyweight', fromInput(e.target.value, u))} />
      </label>
      <label>나이
        <input type="number" min="0" max="100" value={p.age ?? ''} onChange={(e) => setField('age', numOrNull(e.target.value))} />
      </label>
    </div>
  )
}
