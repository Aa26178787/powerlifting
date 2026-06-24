import React, { useState } from 'react'
import { loadAdjustment, updateE1rm } from '../../engine/autoreg.js'

const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]

export default function RpeLogger({ exercise }) {
  const [actual, setActual] = useState('')

  const hasValue = actual !== ''
  const actualRpe = Number(actual)
  const nextWeight = hasValue ? loadAdjustment(exercise.rpeTarget, actualRpe, exercise.weight) : null
  const newE1rm = hasValue ? updateE1rm(exercise.weight, exercise.reps, actualRpe) : null

  return (
    <span className="rpe-logger">
      <label>
        실제 RPE
        <select value={actual} onChange={(e) => setActual(e.target.value)}>
          <option value="">—</option>
          {RPE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      {hasValue && (
        <span className="suggestion">
          추천 중량: {nextWeight} (추정 1RM {newE1rm.toFixed(1)})
        </span>
      )}
    </span>
  )
}
