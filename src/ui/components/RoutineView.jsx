import React, { useState, useMemo } from 'react'
import { exerciseName, templateLabel, qualityLabel, schemeLabel, evidenceLabel, restLabel, sessionDayLabel, fitVerdictLabel, accessoryFitReason, streetGripLabel } from '../i18n.js'
import { byName } from '../../engine/exercises.js'
import { judgeAccessoryFit } from '../../engine/accessoryFit.js'
import { useProfileStore } from '../store/profileStore.js'
import { detectOverreaching } from '../../engine/overreaching.js'
import { toDisplay, unitLabel } from '../lib/units.js'
import { resolveE1rm } from '../../engine/generate.js'
import { effectiveLiftE1rm, liftEntries } from '../../engine/loadFeedback.js'
import CheckinPanel from './CheckinPanel.jsx'
import LiftLogRow from './LiftLogRow.jsx'
import InsightsPanel from './InsightsPanel.jsx' // InsightsPanel (S3 Task 2)
import OverloadBanner from './OverloadBanner.jsx' // Spec 4 Task 4
import { PATTERNS, patternOf, exercisesForPattern, displayPatternLabel } from '../../engine/movementPattern.js' // per-row accessory swap
import { allEquipment } from '../../engine/exercises.js' // picker shows full catalog (override bypasses equip filter)

// The manual swap picker lists the FULL catalog regardless of the user's selected
// equipment: a user-picked accessory is force-included by generate() (byName bypasses
// the equipment filter), so limiting the picker would hide reachable choices.
const ALL_EQUIP = allEquipment()

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

function AccessoryRow({ acc, onRegenerate, muscleSummary }) {
  const scheme = acc.scheme
  const overrides = useProfileStore((s) => s.profile.accessoryOverrides ?? {})
  const setField = useProfileStore((s) => s.setField)
  const schemeOverrides = useProfileStore((s) => s.profile.accessorySchemeOverrides ?? {})
  const setAccessoryScheme = useProfileStore((s) => s.setAccessoryScheme)
  const clearAccessoryScheme = useProfileStore((s) => s.clearAccessoryScheme)
  const styleAll = useProfileStore((s) => s.profile.style ?? {})
  const regionStatus = useProfileStore((s) => s.profile.regionStatus ?? {})
  const stickAll = useProfileStore((s) => s.profile.stickingPoint ?? {})
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [fitOpen, setFitOpen] = useState(false)

  // Feature 4: advisory fit-judge. The supporting lift = the accessory's targetLift
  // (general accessories → no style emphasis, region/MRV checks still apply).
  const fitEx = byName(acc.name)
  const fitLift = fitEx && ['squat', 'bench', 'deadlift'].includes(fitEx.targetLift) ? fitEx.targetLift : null
  const fit = useMemo(() => judgeAccessoryFit({
    name: acc.name, lift: fitLift, style: fitLift ? (styleAll[fitLift] ?? {}) : {},
    regionStatus, quality: acc.quality, muscleSummary, equipment: ALL_EQUIP,
    stickingPoint: fitLift ? (stickAll[fitLift] ?? 'none') : 'none',
  }), [acc.name, fitLift, styleAll, regionStatus, acc.quality, muscleSummary, stickAll])
  const fitIcon = { good: '✓', ok: '·', caution: '⚠', avoid: '⛔' }[fit.verdict]
  // Feature 3: per-accessory sets/reps edit, keyed by the displayed (final) name.
  const ovCur = schemeOverrides[acc.name]
  const [eSets, setESets] = useState(String(ovCur?.sets ?? scheme?.sets?.length ?? 3))
  const [eReps, setEReps] = useState(String(ovCur?.reps ?? scheme?.sets?.[0]?.reps ?? 10))
  const [eRpe, setERpe] = useState(ovCur?.rpe != null ? String(ovCur.rpe) : '')
  const saveEdit = () => {
    setAccessoryScheme(acc.name, { sets: Number(eSets), reps: Number(eReps), rpe: eRpe === '' ? null : Number(eRpe) })
    setEditOpen(false); onRegenerate?.()
  }
  const resetEdit = () => { clearAccessoryScheme(acc.name); setEditOpen(false); onRegenerate?.() }
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
        <span className="acc-name" title={exerciseName(acc.name)}>{displayPatternLabel(acc)}</span>
        {acc.quality && <span className="badge q" data-quality={acc.quality}>{qualityLabel(acc.quality)}</span>}
        {scheme && <span className="badge scheme">{schemeLabel(scheme.type)}</span>}
        <span className="acc-feel">체감</span>
        {ovCur && <span className="badge edited">수정됨</span>}
        {fit.verdict !== 'ok' && (
          <button type="button" className={`badge fit fit-${fit.verdict}`} onClick={() => setFitOpen((o) => !o)}
            title="적합도 안내 (참고용 · 차단하지 않음)">
            적합도 {fitVerdictLabel(fit.verdict)} {fitIcon}
          </button>
        )}
        <button type="button" className="btn-mini acc-change" onClick={() => setOpen((o) => !o)}>변경</button>
        <button type="button" className="btn-mini acc-edit-toggle" onClick={() => setEditOpen((o) => !o)}>세트·반복</button>
      </div>
      {fitOpen && (
        <div className="acc-fit">
          <ul className="acc-fit-reasons">
            {fit.reasons.length
              ? fit.reasons.map((r, i) => <li key={i} data-severity={r.severity}>{accessoryFitReason(r.code, r)}</li>)
              : <li>특이사항 없음 — 무난한 선택입니다.</li>}
          </ul>
          {(fit.verdict === 'caution' || fit.verdict === 'avoid') && fit.suggestions.length > 0 && (
            <button type="button" className="btn-mini fit-suggest" onClick={() => choose(fit.suggestions[0])}>
              추천으로 교체: {exerciseName(fit.suggestions[0])}
            </button>
          )}
          <p className="acc-fit-note" style={{ fontSize: '0.8em', color: '#888', margin: '2px 0 0' }}>
            참고용 안내입니다. 차단하지 않으며 최종 선택은 본인 판단이 우선입니다. (근거 약함)
          </p>
        </div>
      )}
      {editOpen && (
        <div className="acc-edit">
          <label>세트<input type="number" min="1" max="8" value={eSets} onChange={(e) => setESets(e.target.value)} style={{ width: '3.5em', marginLeft: '0.3em' }} /></label>
          <label>반복<input type="number" min="3" max="30" value={eReps} onChange={(e) => setEReps(e.target.value)} style={{ width: '3.5em', marginLeft: '0.3em' }} /></label>
          <label>RPE<input type="number" min="5" max="10" step="0.5" value={eRpe} placeholder="자동" onChange={(e) => setERpe(e.target.value)} style={{ width: '3.5em', marginLeft: '0.3em' }} /></label>
          <button type="button" className="btn-mini" onClick={saveEdit}>저장</button>
          <button type="button" className="btn-mini" onClick={resetEdit}>초기화</button>
          <span className="acc-edit-hint" style={{ fontSize: '0.8em', color: '#888' }}>
            권장 {acc.quality === 'endurance' ? '12–25회' : '6–15회'} · 2–5세트 (벗어나면 자극·피로 균형이 깨질 수 있음)
          </span>
        </div>
      )}
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
                const exs = exercisesForPattern(p.key, ALL_EQUIP)
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

// Feature 5: street-lifting block (weighted dip + weighted pull/chin-up), rendered
// once per week after the sessions. Shows the system load (체중×k + 추가) and the
// belt/added weight the lifter actually loads.
// One street lift row, with an advisory fit-judge (region/joint safety mainly —
// dips & pull-ups load shoulder/elbow). Street lifts can't be swapped, so we show
// the verdict + reasons only (no alternative suggestions).
function StreetLiftRow({ lift, units, showFreq }) {
  const styleAll = useProfileStore((s) => s.profile.style ?? {})
  const regionStatus = useProfileStore((s) => s.profile.regionStatus ?? {})
  const [fitOpen, setFitOpen] = useState(false)
  const supLift = lift.lift === 'dip' ? 'bench' : 'deadlift'   // dip supports press, pull-up supports pull
  const fit = useMemo(() => judgeAccessoryFit({
    name: lift.exercise, lift: supLift, style: styleAll[supLift] ?? {},
    regionStatus, quality: 'strength', equipment: ALL_EQUIP,
  }), [lift.exercise, supLift, styleAll, regionStatus])
  const fitIcon = { good: '✓', ok: '·', caution: '⚠', avoid: '⛔' }[fit.verdict]
  const addedLabel = (s) => {
    if (s.mode === 'bodyweight') return '체중만'
    if (s.mode === 'assisted') return `보조 −${toDisplay(s.assistKg, units)}${unitLabel(units)}`
    return `+${toDisplay(s.addedWeight, units)}${unitLabel(units)}`
  }
  return (
    <div className="street-lift">
      <div className="street-lift-header">
        <span className="street-lift-name">{lift.label}</span>
        {lift.grip && <span className="badge">{streetGripLabel(lift.grip)}</span>}
        {showFreq && lift.weeklyFrequency != null && <span className="badge freq">주 {lift.weeklyFrequency}회</span>}
        {fit.verdict !== 'ok' && (
          <button type="button" className={`badge fit fit-${fit.verdict}`} onClick={() => setFitOpen((o) => !o)}
            title="적합도(부위 안전) 안내 · 참고용">적합도 {fitVerdictLabel(fit.verdict)} {fitIcon}</button>
        )}
        <span className="tag evidence">{evidenceLabel(lift.scheme.evidenceTier)}</span>
      </div>
      {fitOpen && (
        <div className="acc-fit">
          <ul className="acc-fit-reasons">
            {fit.reasons.length
              ? fit.reasons.map((r, i) => <li key={i} data-severity={r.severity}>{accessoryFitReason(r.code, r)}</li>)
              : <li>특이사항 없음.</li>}
          </ul>
          <p style={{ fontSize: '0.8em', color: '#888', margin: '2px 0 0' }}>
            참고용 안내입니다(근거 약함). 차단하지 않으며 통증·컨디션은 본인 판단이 우선입니다.
          </p>
        </div>
      )}
      <div className="set-table-wrap">
        <table className="set-table street">
          <thead><tr><th>세트</th><th>추가중량(벨트)</th><th>반복</th><th>RPE</th></tr></thead>
          <tbody>
            {lift.scheme.sets.map((s, i) => (
              <tr key={i}>
                <td>{i + 1}{s.label ? <span className="set-label"> {s.label}</span> : ''}</td>
                <td className="num">{addedLabel(s)}</td>
                <td className="num">{s.reps}</td>
                <td className="num">{s.rpe != null ? s.rpe : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StreetSection({ street, units, showFreq = false }) {
  return (
    <div className="street-section">
      <h4>스트리트 리프팅 (추가중량 트랙)</h4>
      <p className="street-note" style={{ fontSize: '0.82em', color: '#888', margin: '0 0 6px' }}>
        표시 무게는 <strong>벨트에 다는 추가중량(체중 미포함)</strong>입니다. 정식 4번째 메인 리프트가 아닌 보조 트랙입니다.
      </p>
      {street.map((lift, li) => (
        <StreetLiftRow key={li} lift={lift} units={units} showFreq={showFreq} />
      ))}
    </div>
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
        {/* One collapsible condition check-in per session, pinned at the top (day + 컨디션) */}
        <details className="checkin-block">
          <summary className="checkin-head">
            <span className="session-day">{sessionDayLabel(s.day, profile.trainingDays ?? [])}</span>
            <span className="checkin-title">오늘 컨디션 반영</span>
            {adjusted[key] && (
              <span className="readiness-badge">readiness {Math.round(adjusted[key].readiness * 100)}%</span>
            )}
          </summary>
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
        <ul>{view.exercises.map((ex, i) => <ExerciseRow key={i} ex={ex} units={units} week={wk.index} day={s.day} />)}</ul>
        {(view.accessories ?? []).length > 0 && (
          <div className="accessories">
            <h5>보조운동</h5>
            <ul>{view.accessories.map((a, i) => <AccessoryRow key={i} acc={a} onRegenerate={onRegenerate} muscleSummary={wk.muscleVolume} />)}</ul>
          </div>
        )}
        {(s.street ?? []).length > 0 && <StreetSection street={s.street} units={units} />}
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
          renderBody={() => (
            <>
              {wk.sessions.map((s) => renderSession(wk, s))}
              {wk.street && wk.street.length > 0 && <StreetSection street={wk.street} units={units} showFreq />}
            </>
          )} />
      ))}
    </section>
  )
}
