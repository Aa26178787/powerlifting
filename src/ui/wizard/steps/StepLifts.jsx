import React from 'react'
import { useProfileStore } from '../../store/profileStore.js'
import { assess } from '../../../engine/standards.js'
import StrengthAssessment from '../StrengthAssessment.jsx'
import { liftLabel } from '../../i18n.js'
import { toDisplay, fromInput, unitLabel } from '../../lib/units.js'
export default function StepLifts() {
  const p = useProfileStore((s) => s.profile)
  const setLift = useProfileStore((s) => s.setLift)
  const setPriorityLift = useProfileStore((s) => s.setPriorityLift)
  const u = p.units ?? 'kg'
  const oneRMs = { squat: p.lifts.squat?.oneRM ?? 0, bench: p.lifts.bench?.oneRM ?? 0, deadlift: p.lifts.deadlift?.oneRM ?? 0 }
  const a = assess(oneRMs, p.bodyweight, p.sex)
  return (
    <div>
      {['squat', 'bench', 'deadlift'].map((l) => (
        <label key={l}>{liftLabel(l)} 1RM ({unitLabel(u)})
          <input type="number" min="0" value={p.lifts[l]?.oneRM == null ? '' : toDisplay(p.lifts[l].oneRM, u, false)} onChange={(e) => setLift(l, { oneRM: fromInput(e.target.value, u) })} />
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
