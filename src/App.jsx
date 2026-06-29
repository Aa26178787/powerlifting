import React from 'react'
import { useProfileStore } from './ui/store/profileStore.js'
import { buildPlan } from './ui/lib/planAdapter.js'
import { planToCsv } from './ui/lib/exportCsv.js'
import { detectOverreaching } from './engine/overreaching.js'
import Wizard from './ui/wizard/Wizard.jsx'
import RoutineView from './ui/components/RoutineView.jsx'
import LimitsPanel from './ui/components/LimitsPanel.jsx'

export default function App() {
  const profile    = useProfileStore((s) => s.profile)
  const plan       = useProfileStore((s) => s.plan)
  const liftLog    = useProfileStore((s) => s.liftLog)
  const checkinLog = useProfileStore((s) => s.checkinLog)
  const setState   = useProfileStore.setState

  const over = detectOverreaching(checkinLog)

  // Both onGenerate (Wizard completion) and regenerate (toolbar button) pass the
  // current liftLog so effective e1RM is folded in when log is non-empty.
  // suppressUp prevents upward e1RM revision when overreaching is detected.
  const onGenerate = () =>
    setState((s) => ({ plan: buildPlan(s.profile, s.liftLog, { suppressUp: over.flag }) }))

  const regenerate = () =>
    setState((s) => ({ plan: buildPlan(s.profile, s.liftLog, { suppressUp: over.flag }) }))

  const restart = () => setState({ plan: null })
  const downloadCsv = () => {
    const blob = new Blob(['﻿' + planToCsv(plan, profile.units ?? 'kg')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = 'routine.csv'; a.click(); URL.revokeObjectURL(url)
  }
  return (
    <div className="app">
      <header className="app-header">
        <h1>파워리프팅 루틴 생성기</h1>
        <p className="app-sub">근거 기반 개인화 루틴 · 무게는 RPE 자동조절 제안치</p>
      </header>
      <LimitsPanel />
      {!plan
        ? <Wizard onComplete={onGenerate} />
        : (
          <div>
            <div className="toolbar">
              <button type="button" className="btn" onClick={downloadCsv}>CSV 다운로드</button>
              <button type="button" className="btn btn-secondary" onClick={() => window.print()}>인쇄</button>
              <button type="button" className="btn btn-secondary" onClick={restart}>처음부터</button>
              <button type="button" className="btn btn-secondary" onClick={regenerate}>기록 반영 재생성</button>
              {liftLog.length > 0 && (
                <span className="badge liftlog-pending">
                  기록 {liftLog.length}개 미반영 — 재생성 시 반영
                </span>
              )}
            </div>
            <RoutineView plan={plan} onRegenerate={regenerate} />
          </div>
        )}
    </div>
  )
}
