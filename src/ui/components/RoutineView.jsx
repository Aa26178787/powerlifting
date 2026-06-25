import React, { useState } from 'react'
import { liftLabel, templateLabel, qualityLabel, schemeLabel, evidenceLabel } from '../i18n.js'
import { useProfileStore } from '../store/profileStore.js'
import { detectOverreaching } from '../../engine/overreaching.js'
import CheckinPanel from './CheckinPanel.jsx'

function ExerciseRow({ ex }) {
  const scheme = ex.scheme
  return (
    <li className="exercise-row">
      <div className="ex-header">
        <span className="ex-lift">{liftLabel(ex.lift)}</span>{' '}
        <span className="ex-q">[{qualityLabel(ex.quality)}]</span>{' '}
        {scheme && (
          <>
            <span className="ex-scheme-type">{schemeLabel(scheme.type)}</span>{' '}
            <span className="ex-evidence-tag">{evidenceLabel(scheme.evidenceTier)}</span>{' '}
          </>
        )}
        <span className="ex-autoregulate">(자동조절)</span>
      </div>
      {ex.tempo && (
        <div className="ex-tempo">
          템포 {ex.tempo.join('-')}초 (하강-정지-상승){ex.tempoStop === 'knee' ? ' · 무릎까지' : ''}
        </div>
      )}
      {scheme && scheme.note && (
        <div className="ex-scheme-note">{scheme.note}</div>
      )}
      {scheme && scheme.sets && scheme.sets.length > 0 && (
        <ol className="ex-sets">
          {scheme.sets.map((s, i) => (
            <li key={i}>
              {i + 1}세트: {s.weight}kg × {s.reps}
              {s.rpe != null ? ` @RPE ${s.rpe}` : ''}
              {s.note ? ` · ${s.note}` : ''}
            </li>
          ))}
        </ol>
      )}
    </li>
  )
}

function AccessoryRow({ acc }) {
  const scheme = acc.scheme
  return (
    <li className="accessory-row">
      <div className="acc-header">
        <span className="acc-name">{liftLabel(acc.name)}</span>{' '}
        {acc.quality && <span className="acc-q">[{qualityLabel(acc.quality)}]</span>}{' '}
        {scheme && <span className="acc-scheme-type">{schemeLabel(scheme.type)}</span>}
      </div>
      {scheme && scheme.note && <div className="acc-scheme-note">{scheme.note}</div>}
      {scheme && scheme.sets && scheme.sets.length > 0 && (
        <ol className="acc-sets">
          {scheme.sets.map((s, i) => (
            <li key={i}>
              {i + 1}세트: {s.reps}회{s.rpe != null ? ` @RPE ${s.rpe}` : ''} (체감)
              {s.note ? ` · ${s.note}` : ''}
            </li>
          ))}
        </ol>
      )}
    </li>
  )
}

export default function RoutineView({ plan }) {
  const checkinLog = useProfileStore((s) => s.checkinLog)
  const logCheckin = useProfileStore((s) => s.logCheckin)
  const [adjusted, setAdjusted] = useState({})

  if (!plan) return <p className="placeholder">아직 루틴이 없습니다. 왼쪽에 정보를 입력하고 '루틴 생성' 버튼을 눌러주세요.</p>

  const over = detectOverreaching(checkinLog)

  return (
    <section className="routine-view">
      <h2>프로그램: {templateLabel(plan.template)}</h2>
      {over.flag && (
        <div className="overreaching-banner">⚠️ {over.reason} · 디로드를 고려하세요</div>
      )}
      {plan.weeks.map((wk) => (
        <div key={wk.index} className={`week${wk.isDeload ? ' deload' : ''}`}>
          <h3>{wk.index}주차{wk.isDeload ? ' (디로드)' : ''}</h3>
          {wk.sessions.map((s) => {
            const key = `${wk.index}-${s.day}`
            const view = adjusted[key]?.session ?? s
            return (
              <div key={s.day} className="session">
                <h4>{s.day}일차</h4>
                <CheckinPanel
                  session={s}
                  weekIndex={wk.index}
                  onApply={(r) => {
                    setAdjusted((m) => ({
                      ...m,
                      [`${wk.index}-${r.day}`]: { session: r.adjusted, readiness: r.readiness },
                    }))
                    logCheckin({ week: wk.index, day: r.day, readiness: r.readiness })
                  }}
                />
                {adjusted[key] && (
                  <span className="readiness-badge">오늘 readiness {Math.round(adjusted[key].readiness * 100)}%</span>
                )}
                <ul>{view.exercises.map((ex, i) => <ExerciseRow key={i} ex={ex} />)}</ul>
                {(view.accessories ?? []).length > 0 && (
                  <div className="accessories">
                    <h5>보조운동</h5>
                    <ul>{view.accessories.map((a, i) => <AccessoryRow key={i} acc={a} />)}</ul>
                  </div>
                )}
                {view.notes && view.notes.length > 0 && (
                  <p className="notes">⚠️ {view.notes.join(' · ')}</p>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </section>
  )
}
