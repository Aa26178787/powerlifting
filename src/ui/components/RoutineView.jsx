import React from 'react'
import { liftLabel, templateLabel } from '../i18n.js'

function ExerciseRow({ ex }) {
  const pct = ex.pct == null ? '—' : `${ex.pct}%`
  return (
    <li className="exercise-row">
      <span className="ex-lift">{liftLabel(ex.lift)}</span>{' '}
      <span className="ex-scheme">{ex.sets}×{ex.reps}</span>{' '}
      <span className="ex-load">@ {pct} / RPE {ex.rpeTarget}</span>{' '}
      <span className="ex-weight">= {ex.weight}</span>
    </li>
  )
}

export default function RoutineView({ plan }) {
  if (!plan) return <p className="placeholder">아직 루틴이 없습니다. 왼쪽에 정보를 입력하고 ‘루틴 생성’ 버튼을 눌러주세요.</p>
  return (
    <section className="routine-view">
      <h2>프로그램: {templateLabel(plan.template)}</h2>
      {plan.weeks.map((wk) => (
        <div key={wk.index} className={`week${wk.isDeload ? ' deload' : ''}`}>
          <h3>{wk.index}주차{wk.isDeload ? ' (디로드)' : ''}</h3>
          {wk.sessions.map((s) => (
            <div key={s.day} className="session">
              <h4>{s.day}일차</h4>
              <ul>{s.exercises.map((ex, i) => <ExerciseRow key={i} ex={ex} />)}</ul>
              {s.accessories.length > 0 && (
                <p className="accessories">보조운동: {s.accessories.map(liftLabel).join(', ')}</p>
              )}
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}
