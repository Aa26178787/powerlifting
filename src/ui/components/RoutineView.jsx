import React, { useState } from 'react'
import { exerciseName, templateLabel, qualityLabel, schemeLabel, evidenceLabel, restLabel } from '../i18n.js'
import { useProfileStore } from '../store/profileStore.js'
import { detectOverreaching } from '../../engine/overreaching.js'
import { toDisplay, unitLabel } from '../lib/units.js'
import CheckinPanel from './CheckinPanel.jsx'

function ExerciseRow({ ex, units }) {
  const scheme = ex.scheme
  const warmup = ex.warmup ?? []
  return (
    <li className="exercise-row" data-quality={ex.quality}>
      <div className="ex-header">
        <span className="ex-lift">{exerciseName(ex.lift)}</span>
        <span className="badge q" data-quality={ex.quality}>{qualityLabel(ex.quality)}</span>
        {scheme && <span className="badge scheme">{schemeLabel(scheme.type)}</span>}
        {scheme && <span className="tag evidence">{evidenceLabel(scheme.evidenceTier)}</span>}
        <span className="ex-autoregulate">자동조절</span>
      </div>
      {ex.tempo && (
        <div className="ex-tempo">
          템포 {ex.tempo.join('-')}초 (하강-정지-상승){ex.tempoStop === 'knee' ? ' · 무릎까지' : ''}
        </div>
      )}
      {scheme && scheme.note && (
        <div className="ex-scheme-note">{scheme.note}</div>
      )}
      {ex.quality && (
        <div className="ex-rest">세트 간 휴식 {restLabel(ex.quality)}</div>
      )}
      {scheme && (warmup.length > 0 || (scheme.sets && scheme.sets.length > 0)) && (
        <div className="set-table-wrap">
          <table className="set-table">
            <thead><tr><th>세트</th><th>무게</th><th>반복</th><th>RPE</th><th>비고</th></tr></thead>
            <tbody>
              {warmup.map((s, i) => (
                <tr key={`w${i}`} className="warmup-row">
                  <td className="warmup-label">워밍업 {i + 1}</td>
                  <td className="num">{(() => { const w = toDisplay(s.weight, units); return w === '' ? '—' : w + unitLabel(units) })()}</td>
                  <td className="num">{s.reps}</td>
                  <td className="num">—</td>
                  <td></td>
                </tr>
              ))}
              {scheme.sets && scheme.sets.map((s, i) => (
                <tr key={i}>
                  <td>{i + 1}{s.label ? <span className="set-label"> {s.label}</span> : ''}</td>
                  <td className="num">{(() => { const w = toDisplay(s.weight, units); return w === '' ? '—' : w + unitLabel(units) })()}</td>
                  <td className="num">{s.reps}</td>
                  <td className="num">{s.rpe != null ? s.rpe : '—'}</td>
                  <td>{s.note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </li>
  )
}

function AccessoryRow({ acc }) {
  const scheme = acc.scheme
  return (
    <li className="accessory-row" data-quality={acc.quality}>
      <div className="acc-header">
        <span className="acc-name">{exerciseName(acc.name)}</span>
        {acc.quality && <span className="badge q" data-quality={acc.quality}>{qualityLabel(acc.quality)}</span>}
        {scheme && <span className="badge scheme">{schemeLabel(scheme.type)}</span>}
        <span className="acc-feel">체감</span>
      </div>
      {scheme && scheme.note && <div className="acc-scheme-note">{scheme.note}</div>}
      {acc.quality && (
        <div className="acc-rest">세트 간 휴식 {restLabel(acc.quality)}</div>
      )}
      {scheme && scheme.sets && scheme.sets.length > 0 && (
        <div className="set-table-wrap">
          <table className="set-table acc">
            <thead><tr><th>세트</th><th>반복</th><th>RPE</th><th>비고</th></tr></thead>
            <tbody>
              {scheme.sets.map((s, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td className="num">{s.reps}회</td>
                  <td className="num">{s.rpe != null ? s.rpe : '—'}</td>
                  <td>{s.note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </li>
  )
}

export default function RoutineView({ plan }) {
  const checkinLog = useProfileStore((s) => s.checkinLog)
  const logCheckin = useProfileStore((s) => s.logCheckin)
  const units = useProfileStore((s) => s.profile.units ?? 'kg')
  const profile = useProfileStore((s) => s.profile)
  const [adjusted, setAdjusted] = useState({})

  if (!plan) return <p className="placeholder">아직 루틴이 없습니다. 왼쪽에 정보를 입력하고 '루틴 생성' 버튼을 눌러주세요.</p>

  const over = detectOverreaching(checkinLog)

  return (
    <section className="routine-view">
      <h2>프로그램: {templateLabel(plan.template)}</h2>
      {over.flag && (
        <div className="overreaching-banner" role="alert">경고: ⚠️ {over.reason} · 디로드를 고려하세요</div>
      )}
      {plan.weeks.map((wk) => (
        <div key={wk.index} className={`week${wk.isDeload ? ' deload' : ''}`}>
          <h3>{wk.index}주차</h3>
          {wk.sessions.map((s) => {
            const key = `${wk.index}-${s.day}`
            const view = adjusted[key]?.session ?? s
            return (
              <div key={s.day} className="session">
                <h4>{s.day}일차</h4>
                <details>
                  <summary>오늘 컨디션 반영</summary>
                  <CheckinPanel
                    session={s}
                    weekIndex={wk.index}
                    profile={profile}
                    overreaching={over.flag}
                    onApply={(r) => {
                      setAdjusted((m) => ({
                        ...m,
                        [`${wk.index}-${r.day}`]: { session: r.adjusted, readiness: r.readiness },
                      }))
                      logCheckin({ week: wk.index, day: r.day, readiness: r.readiness })
                    }}
                  />
                </details>
                {adjusted[key] && (
                  <span className="readiness-badge">오늘 readiness {Math.round(adjusted[key].readiness * 100)}%</span>
                )}
                <ul>{view.exercises.map((ex, i) => <ExerciseRow key={i} ex={ex} units={units} />)}</ul>
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
