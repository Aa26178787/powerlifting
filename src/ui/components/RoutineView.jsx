import React from 'react'

function ExerciseRow({ ex }) {
  const pct = ex.pct == null ? '—' : `${ex.pct}%`
  return (
    <li className="exercise-row">
      <span className="ex-lift">{ex.lift}</span>{' '}
      <span className="ex-scheme">{ex.sets}×{ex.reps}</span>{' '}
      <span className="ex-load">@ {pct} / RPE {ex.rpeTarget}</span>{' '}
      <span className="ex-weight">= {ex.weight}</span>
    </li>
  )
}

export default function RoutineView({ plan }) {
  if (!plan) return <p className="placeholder">No routine yet — fill the form and generate.</p>
  return (
    <section className="routine-view">
      <h2>Template: {plan.template}</h2>
      {plan.weeks.map((wk) => (
        <div key={wk.index} className={`week${wk.isDeload ? ' deload' : ''}`}>
          <h3>Week {wk.index}{wk.isDeload ? ' (DELOAD)' : ''}</h3>
          {wk.sessions.map((s) => (
            <div key={s.day} className="session">
              <h4>Day {s.day}</h4>
              <ul>{s.exercises.map((ex, i) => <ExerciseRow key={i} ex={ex} />)}</ul>
              {s.accessories.length > 0 && (
                <p className="accessories">Accessories: {s.accessories.join(', ')}</p>
              )}
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}
