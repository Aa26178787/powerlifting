import React from 'react'
import { useProfileStore } from '../../store/profileStore.js'
import { assess } from '../../../engine/standards.js'
import StrengthAssessment from '../StrengthAssessment.jsx'
import { liftLabel } from '../../i18n.js'
const numOrNull = (v) => { const n = parseFloat(v); return Number.isNaN(n) ? null : n }
export default function StepLifts() {
  const p = useProfileStore((s) => s.profile)
  const setLift = useProfileStore((s) => s.setLift)
  const setPriorityLift = useProfileStore((s) => s.setPriorityLift)
  const oneRMs = { squat: p.lifts.squat?.oneRM ?? 0, bench: p.lifts.bench?.oneRM ?? 0, deadlift: p.lifts.deadlift?.oneRM ?? 0 }
  const a = assess(oneRMs, p.bodyweight, p.sex)
  return (
    <div>
      {['squat', 'bench', 'deadlift'].map((l) => (
        <label key={l}>{liftLabel(l)} 1RM
          <input type="number" value={p.lifts[l]?.oneRM ?? ''} onChange={(e) => setLift(l, { oneRM: numOrNull(e.target.value) })} />
        </label>
      ))}
      <StrengthAssessment oneRMs={oneRMs} bodyweight={p.bodyweight} sex={p.sex} />
      {a && a.weakLift && (
        <label>
          <input type="checkbox" checked={p.priorityLift === a.weakLift}
            onChange={(e) => setPriorityLift(e.target.checked ? a.weakLift : null)} />
          {liftLabel(a.weakLift)} 우선 보강
        </label>
      )}
    </div>
  )
}
