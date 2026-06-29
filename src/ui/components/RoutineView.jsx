import React, { useState } from 'react'
import { exerciseName, templateLabel, qualityLabel, schemeLabel, evidenceLabel, restLabel, sessionDayLabel } from '../i18n.js'
import { useProfileStore } from '../store/profileStore.js'
import { detectOverreaching } from '../../engine/overreaching.js'
import { toDisplay, unitLabel } from '../lib/units.js'
import { resolveE1rm } from '../../engine/generate.js'
import { effectiveLiftE1rm, liftEntries } from '../../engine/loadFeedback.js'
import CheckinPanel from './CheckinPanel.jsx'
import LiftLogRow from './LiftLogRow.jsx'
import InsightsPanel from './InsightsPanel.jsx' // InsightsPanel (S3 Task 2)
import OverloadBanner from './OverloadBanner.jsx' // Spec 4 Task 4
import { PATTERNS, patternOf, exercisesForPattern } from '../../engine/movementPattern.js' // per-row accessory swap

// ExerciseRow now receives week+day so LiftLogRow can tag the log entry.
function ExerciseRow({ ex, units, week, day }) {
  const scheme = ex.scheme
  return (
    <li className="exercise-row" data-quality={ex.quality}>
      <div className="ex-header">
        <span className="ex-lift">{exerciseName(ex.lift)}</span>
        <span className="badge q" data-quality={ex.quality}>{qualityLabel(ex.quality)}</span>
        {scheme && <span className="badge scheme">{schemeLabel(scheme.type)}</span>}
        {scheme && <span className="tag evidence">{evidenceLabel(scheme.evidenceTier)}</span>}
        <LiftLogRow ex={ex} week={week} day={day} units={units} />
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
      {scheme && scheme.sets && scheme.sets.length > 0 && (
        <div className="set-table-wrap">
          <table className="set-table">
            <thead><tr><th>세트</th><th>무게</th><th>반복</th><th>RPE</th><th>비고</th></tr></thead>
            <tbody>
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

function AccessoryRow({ acc, onRegenerate }) {
  const scheme = acc.scheme
  const overrides = useProfileStore((s) => s.profile.accessoryOverrides ?? {})
  const equipment = useProfileStore((s) => s.profile.equipment ?? [])
  const setField = useProfileStore((s) => s.setField)
  const [open, setOpen] = useState(false)
  // accSlot = the slot's auto-assigned pattern (stable override key); current = the
  // pattern actually shown (may be an override).
  const slot = acc.accSlot ?? patternOf(acc.primaryMuscle)
  const current = patternOf(acc.primaryMuscle)
  const choose = (value) => {   // value = pattern key or specific exercise name
    setField('accessoryOverrides', { ...overrides, [slot]: value })
    setOpen(false); onRegenerate?.()
  }
  const recommend = () => {
    const next = { ...overrides }; delete next[slot]
    setField('accessoryOverrides', next)
    setOpen(false); onRegenerate?.()
  }
  return (
    <li className="accessory-row" data-quality={acc.quality}>
      <div className="acc-header">
        <span className="acc-name">{exerciseName(acc.name)}</span>
        {acc.quality && <span className="badge q" data-quality={acc.quality}>{qualityLabel(acc.quality)}</span>}
        {scheme && <span className="badge scheme">{schemeLabel(scheme.type)}</span>}
        <span className="acc-feel">체감</span>
        <button type="button" className="btn-mini acc-change" onClick={() => setOpen((o) => !o)}>변경</button>
      </div>
      {open && (
        <div className="acc-chooser">
          <span className="acc-chooser-label">동작 패턴 변경:</span>
          <button type="button" className="btn-mini acc-recommend" onClick={recommend}>추천(자동)</button>
          {PATTERNS.map((p) => (
            <button key={p.key} type="button" className="btn-mini" disabled={p.key === current} onClick={() => choose(p.key)}>
              {p.label}
            </button>
          ))}
          <label className="acc-exercise-pick">종목 직접 선택:
            <select value="" onChange={(e) => { if (e.target.value) choose(e.target.value) }}>
              <option value="">— 선택 —</option>
              {PATTERNS.map((p) => {
                const exs = exercisesForPattern(p.key, equipment)
                return exs.length ? (
                  <optgroup key={p.key} label={p.label}>
                    {exs.map((ex) => <option key={ex.name} value={ex.name}>{exerciseName(ex.name)}</option>)}
                  </optgroup>
                ) : null
              })}
            </select>
          </label>
        </div>
      )}
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

// Lazily renders a week's body only when expanded — a long (e.g. 24-week) plan has
// thousands of nodes; rendering every week at once blocks the main thread ("응답 없음").
// Collapsed weeks show only their summary; the body mounts on open.
function WeekBlock({ wk, defaultOpen, renderBody }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <details className={`week${wk.isDeload ? ' deload' : ''}`} open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="week-summary">{wk.index}주차</summary>
      {open && <div className="week-body">{renderBody()}</div>}
    </details>
  )
}

export default function RoutineView({ plan, onRegenerate }) {
  const checkinLog = useProfileStore((s) => s.checkinLog)
  const logCheckin = useProfileStore((s) => s.logCheckin)
  const units = useProfileStore((s) => s.profile.units ?? 'kg')
  const profile = useProfileStore((s) => s.profile)
  const liftLog  = useProfileStore((s) => s.liftLog)  // InsightsPanel (S3 Task 2)
  const [adjusted, setAdjusted] = useState({})

  // InsightsPanel (S3 Task 2): derive effective e1RM map from profile + log history.
  // resolveE1rm handles both oneRM-direct and weight/reps/rpe derivation.
  const e1rmMap = {}
  for (const lift of ['squat', 'bench', 'deadlift']) {
    try {
      const seed = resolveE1rm(profile.lifts?.[lift])
      e1rmMap[lift] = effectiveLiftE1rm(seed, liftEntries(liftLog, lift))
    } catch {
      // invalid lift input (no oneRM and no weight/reps/rpe) — skip
    }
  }

  if (!plan) return <p className="placeholder">아직 루틴이 없습니다. 왼쪽에 정보를 입력하고 '루틴 생성' 버튼을 눌러주세요.</p>

  const over = detectOverreaching(checkinLog)
  const firstOpenIdx = Math.max(0, plan.weeks.findIndex((w) => !w.isDeload))

  const renderSession = (wk, s) => {
    const key = `${wk.index}-${s.day}`
    const view = adjusted[key]?.session ?? s
    return (
      <div key={s.day} className="session">
        <h4>{sessionDayLabel(s.day, profile.trainingDays ?? [])}</h4>
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
        <ul>{view.exercises.map((ex, i) => <ExerciseRow key={i} ex={ex} units={units} week={wk.index} day={s.day} />)}</ul>
        {(view.accessories ?? []).length > 0 && (
          <div className="accessories">
            <h5>보조운동</h5>
            <ul>{view.accessories.map((a, i) => <AccessoryRow key={i} acc={a} onRegenerate={onRegenerate} />)}</ul>
          </div>
        )}
        {view.notes && view.notes.length > 0 && (
          <p className="notes">⚠️ {view.notes.join(' · ')}</p>
        )}
      </div>
    )
  }

  return (
    <section className="routine-view">
      <h2>프로그램: {templateLabel(plan.template)}</h2>
      {over.flag && (
        <div className="overreaching-banner" role="alert">경고: ⚠️ {over.reason} · 디로드를 고려하세요</div>
      )}
      {/* Spec 4 Task 4: overload risk/EV/abort/cooldown banner */}
      {plan.overload && <OverloadBanner overload={plan.overload} checkinLog={checkinLog} />}
      {/* InsightsPanel (S3 Task 2): advisory analytics from liftLog */}
      <InsightsPanel log={liftLog} e1rm={e1rmMap} />
      {plan.weeks.map((wk, wi) => (
        <WeekBlock key={wk.index} wk={wk} defaultOpen={wi === firstOpenIdx}
          renderBody={() => wk.sessions.map((s) => renderSession(wk, s))} />
      ))}
    </section>
  )
}
