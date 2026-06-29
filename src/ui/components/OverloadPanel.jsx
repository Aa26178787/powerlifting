import React, { useState, useEffect } from 'react'
import { useProfileStore } from '../store/profileStore.js'
import { PRESETS, applyPreset, overloadDose, overloadRisk, overloadEV } from '../../engine/overload.js'

const LIFT_LABELS = { squat: '스쿼트', bench: '벤치', deadlift: '데드리프트' }
const TIER_LABELS = { low: 'low (낮음)', moderate: 'moderate (보통)', high: 'high (높음)', extreme: 'extreme (매우 높음)' }

export default function OverloadPanel() {
  const o = useProfileStore((s) => s.profile.overload)
  const profile = useProfileStore((s) => s.profile)
  const setOverload = useProfileStore((s) => s.setOverload)

  function handleToggle(e) {
    setOverload({ enabled: e.target.checked })
  }

  function handleLiftToggle(lift) {
    const lifts = o.lifts.includes(lift)
      ? o.lifts.filter((l) => l !== lift)
      : [...o.lifts, lift]
    setOverload({ lifts })
  }

  // Number inputs use raw local state while editing and clamp on blur (matching
  // StepPeriodization). Clamping on every keystroke breaks free typing: clearing
  // the field would snap to the fallback and intermediate digits would jump to the
  // bounds. useEffect re-syncs the raw value when the store changes externally
  // (e.g. a preset fills the fields).
  const [pctRaw, setPctRaw] = useState(String(o.targetPct))
  const [weeksRaw, setWeeksRaw] = useState(String(o.overreachWeeks))
  useEffect(() => { setPctRaw(String(o.targetPct)) }, [o.targetPct])
  useEffect(() => { setWeeksRaw(String(o.overreachWeeks)) }, [o.overreachWeeks])

  function commitTargetPct() {
    const v = Math.max(1, Math.min(10, Number(pctRaw) || 1))
    setPctRaw(String(v))
    setOverload({ targetPct: v })
  }

  function commitOverreachWeeks() {
    const v = Math.max(3, Math.min(8, Number(weeksRaw) || 3))
    setWeeksRaw(String(v))
    setOverload({ overreachWeeks: v })
  }

  function handlePreset(e) {
    const key = e.target.value
    if (!key) { setOverload({ preset: null }); return }
    const preset = applyPreset(key)
    if (!preset) return
    setOverload({ preset: key, lifts: preset.lifts, targetPct: preset.targetPct, overreachWeeks: preset.overreachWeeks })
  }

  // Compute live risk + EV only when panel is enabled (Fix 2 — efficiency/clarity)
  let dose, risk, ev
  if (o.enabled) {
    dose = overloadDose(o.targetPct, { lifts: o.lifts })
    risk = overloadRisk({ targetPct: o.targetPct, lifts: o.lifts, overreachWeeks: o.overreachWeeks, years: profile.years, readiness: o.readiness })
    ev = overloadEV(dose, risk)
  }

  return (
    <div className="overload-panel">
      <label>
        <input
          type="checkbox"
          checked={o.enabled}
          onChange={handleToggle}
        />
        {' '}오버로딩 모드(도박수)
      </label>

      {o.enabled && (
        <div className="overload-config">
          <p style={{ fontSize: '0.9em', color: '#c00', margin: '4px 0' }}>
            ⚠ 고위험/고수익 블록 — 결과 보장 없음. 의도적 초과부하 후 테이퍼+테스트.
          </p>

          <fieldset>
            <legend>과부하 종목 (1–3)</legend>
            {['squat', 'bench', 'deadlift'].map((lift) => (
              <label key={lift}>
                <input
                  type="checkbox"
                  checked={o.lifts.includes(lift)}
                  onChange={() => handleLiftToggle(lift)}
                />
                {' '}{LIFT_LABELS[lift]}
              </label>
            ))}
            {o.lifts.length === 0 && (
              <p style={{ color: '#c00', fontSize: '0.85em', margin: '4px 0 0' }}>
                공략할 종목을 1개 이상 선택하세요
              </p>
            )}
          </fieldset>

          <label>목표 %
            <input
              type="number"
              min={1}
              max={10}
              step={0.5}
              value={pctRaw}
              onChange={(e) => setPctRaw(e.target.value)}
              onBlur={commitTargetPct}
            />
          </label>

          <label>과부하 기간 (주)
            <input
              type="number"
              min={3}
              max={8}
              value={weeksRaw}
              onChange={(e) => setWeeksRaw(e.target.value)}
              onBlur={commitOverreachWeeks}
            />
          </label>

          <label>프리셋
            <select value={o.preset ?? ''} onChange={handlePreset}>
              <option value="">— 직접 입력 —</option>
              {Object.entries(PRESETS).map(([key, p]) => (
                <option key={key} value={key}>{p.label}</option>
              ))}
            </select>
          </label>
          {o.preset && PRESETS[o.preset]?.faithful && (
            <p style={{ fontSize: '0.85em', opacity: 0.8 }}>
              이 프리셋은 원본 프로토콜과 유사하게 근사합니다(세트/렙 테이블 미완전 복원).
            </p>
          )}

          <div className="overload-risk" style={{ marginTop: '8px', padding: '6px', background: '#fff8e1', borderRadius: 4 }}>
            <strong>위험도:</strong> {TIER_LABELS[risk.tier] ?? risk.tier}
            {risk.reasons.length > 0 && (
              <ul style={{ margin: '4px 0 0', paddingLeft: '1.2em', fontSize: '0.85em' }}>
                {risk.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
            <p style={{ margin: '4px 0 0', fontSize: '0.85em' }}>
              <strong>성공 시:</strong> {ev.upside}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '0.85em' }}>
              <strong>실패 시:</strong> {ev.downside}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '0.85em', opacity: 0.8 }}>{ev.note}</p>
          </div>
        </div>
      )}
    </div>
  )
}
