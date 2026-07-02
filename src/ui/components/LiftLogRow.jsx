import React, { useState } from 'react'
import { MAIN_LIFTS } from '../../engine/exercises.js'
import { effectiveLiftE1rm, liftEntries } from '../../engine/loadFeedback.js'
import { loadAdjustment } from '../../engine/autoreg.js'
import { adjustedBackoff } from '../../engine/backoffAutoreg.js'
import { resolveE1rm } from '../../engine/generate.js'
import { toDisplay, fromInput, unitLabel } from '../lib/units.js'
import { useProfileStore } from '../store/profileStore.js'

// LiftLogRow — inline logger for main-lift top sets.
// Spec §7 B5: shows only when MAIN_LIFTS.includes(ex.baseLift).
// Dead placeholder 자동조절 (RoutineView line 18) is replaced by this component.
//
// Tier A (advisory): immediate per-set hint from loadAdjustment, ephemeral.
// Tier B (badge): effective e1RM delta vs seed; shown once liftLog has entries.
// Both are display-only — they do NOT modify the plan or the store.

export default function LiftLogRow({ ex, week, day, units }) {
  const logLift  = useProfileStore((s) => s.logLift)
  const liftLog  = useProfileStore((s) => s.liftLog)
  const profile  = useProfileStore((s) => s.profile)

  // --- pre-hook derivations (no early return before useState) ---
  const isMain = MAIN_LIFTS.includes(ex.baseLift)
  const sets = ex.scheme?.sets ?? []
  // Top set: label starts with '탑' (탑/탑싱글/탑(근력)) → fallback to max-weight set.
  const topSet = isMain
    ? (sets.find((s) => s.label?.startsWith('탑')) ??
       (sets.length
         ? sets.reduce((a, b) => ((b.weight ?? -Infinity) > (a.weight ?? -Infinity) ? b : a))
         : null))
    : null
  const topKg = topSet?.weight ?? null

  // Backoff sets of this scheme (topSetBackoff / strengthHypertrophy / topSingleBackoff).
  // Target backoff RPE = the ramp END (max), reps = the backoff set's reps.
  const backoffSets = sets.filter((s) => s.label?.includes('백오프'))
  const backoffReps = backoffSets[0]?.reps
  const backoffTargetRpe = backoffSets.length
    ? Math.max(...backoffSets.map((s) => s.rpe ?? 0))
    : null
  const hasBackoff = backoffSets.length > 0 && Number.isFinite(Number(backoffReps)) && Number.isFinite(backoffTargetRpe)

  // All hooks unconditionally — guard comes *after*.
  const [actualWeight, setActualWeight] = useState(toDisplay(topKg, units, false))
  const [actualReps,   setActualReps]   = useState(topSet?.reps ?? '')
  const [actualRpe,    setActualRpe]    = useState(topSet?.rpe  ?? 8)
  const [flagged,      setFlagged]      = useState(false)

  // Guard: only render for main lifts with a computable top set.
  if (!isMain || !topSet) return null

  // --- Tier A advisory (ephemeral, display-only) ---
  // rpeRef: prefer explicit rpeTarget over set-level rpe; null → hide advisory.
  // Delta steps clamped ±2.5 *before* calling loadAdjustment (autoreg.js unchanged).
  const rpeRef = ex.rpeTarget ?? topSet.rpe
  const showAdvisory = rpeRef != null && topKg != null && Number.isFinite(topKg)
  let advisoryKg = null
  if (showAdvisory) {
    const rawDelta     = (rpeRef - Number(actualRpe)) / 0.5
    const clampedDelta = Math.max(-2.5, Math.min(2.5, rawDelta))
    const adjActualRpe = rpeRef - clampedDelta * 0.5        // back-converted for loadAdjustment API
    advisoryKg = loadAdjustment(rpeRef, adjActualRpe, topKg)
  }

  // --- Top-set-anchored backoff (within-session) ---
  // Uses the ACTUAL top-set performance the lifter enters (weight/reps/RPE) to
  // estimate today's 1RM, then loads the prescribed backoff off THAT — so a heavy
  // day (high actual RPE) or a stale entered 1RM auto-corrects the backoff down.
  const adjBackoff = hasBackoff
    ? adjustedBackoff({
        topWeight: fromInput(actualWeight, units),
        actualReps, actualRpe,
        backoffReps, backoffRpe: backoffTargetRpe,
      })
    : null

  // --- Tier B badge (display-only) ---
  // Show only when there are logged entries for this lift; otherwise badge is trivial.
  const entries = liftEntries(liftLog, ex.baseLift)
  let seed = null
  let effectiveE1rm = null
  if (entries.length > 0) {
    try {
      seed         = resolveE1rm(profile.lifts?.[ex.baseLift])
      effectiveE1rm = effectiveLiftE1rm(seed, entries)
    } catch { /* invalid lift input (null oneRM + no weight/reps/rpe) → no badge */ }
  }

  // --- log action ---
  function handleLog() {
    const kgVal = fromInput(actualWeight, units)
    if (kgVal == null || !Number.isFinite(kgVal) || kgVal <= 0) return
    logLift({
      lift:   ex.baseLift,
      week,
      day,
      weight: kgVal,
      reps:   Number(actualReps),
      rpe:    Number(actualRpe),
      flag:   flagged ? 'pain' : null,
    })
  }

  return (
    <details className="lift-log-row">
      <summary>수행 기록</summary>
      <div className="lift-log-inputs">
        <label>
          실제 무게 ({unitLabel(units)})
          <input
            type="number"
            value={actualWeight}
            step={units === 'lbs' ? 5 : 2.5}
            onChange={(e) => setActualWeight(e.target.value)}
          />
        </label>
        <label>
          반복 수
          <input
            type="number"
            value={actualReps}
            min={1}
            max={20}
            step={1}
            onChange={(e) => setActualReps(e.target.value)}
          />
        </label>
        <label>
          실제 RPE
          <select value={actualRpe} onChange={(e) => setActualRpe(Number(e.target.value))}>
            {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="lift-log-flag">
          <input
            type="checkbox"
            checked={flagged}
            onChange={(e) => setFlagged(e.target.checked)}
          />
          통증·중단
        </label>
        <button type="button" className="btn btn-sm" onClick={handleLog}>
          기록
        </button>
      </div>
      {hasBackoff && (
        <div className="lift-log-backoff">
          <div className="backoff-target">탑 목표: {topSet.reps}회 @RPE {rpeRef ?? topSet.rpe}</div>
          {adjBackoff && (
            <div className="backoff-adjusted">
              실제 수행 기준 백오프: <strong>{toDisplay(adjBackoff.backoffWeight, units)}{unitLabel(units)}</strong>
              {' '}({backoffReps}회 @RPE {backoffTargetRpe}) · 오늘 추정 1RM {toDisplay(adjBackoff.todayE1rm, units)}{unitLabel(units)}
            </div>
          )}
        </div>
      )}
      {showAdvisory && advisoryKg != null && (
        <div className="lift-log-advisory">
          다음 세션 권장 탑: {toDisplay(advisoryKg, units)}{unitLabel(units)}
        </div>
      )}
      {seed != null && effectiveE1rm != null && (
        <div className="lift-log-e1rm-badge">
          추정 1RM {toDisplay(seed, units)}{unitLabel(units)} → {toDisplay(effectiveE1rm, units)}{unitLabel(units)} · 재생성 시 반영
        </div>
      )}
    </details>
  )
}
