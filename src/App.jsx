import React from 'react'
import { useProfileStore } from './ui/store/profileStore.js'
import { buildPlan } from './ui/lib/planAdapter.js'
import { planToCsv } from './ui/lib/exportCsv.js'
import Wizard from './ui/wizard/Wizard.jsx'
import RoutineView from './ui/components/RoutineView.jsx'
import LimitsPanel from './ui/components/LimitsPanel.jsx'

export default function App() {
  const profile = useProfileStore((s) => s.profile)
  const plan = useProfileStore((s) => s.plan)
  const setState = useProfileStore.setState
  const onGenerate = () => setState({ plan: buildPlan(profile) })
  const restart = () => setState({ plan: null })
  const downloadCsv = () => {
    const blob = new Blob(['﻿' + planToCsv(plan)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = 'routine.csv'; a.click(); URL.revokeObjectURL(url)
  }
  return (
    <div className="app">
      <h1>파워리프팅 루틴 생성기</h1>
      <LimitsPanel />
      {!plan
        ? <Wizard onComplete={onGenerate} />
        : (
          <div>
            <div className="toolbar">
              <button type="button" onClick={downloadCsv}>CSV 다운로드</button>
              <button type="button" onClick={() => window.print()}>인쇄</button>
              <button type="button" onClick={restart}>처음부터</button>
            </div>
            <RoutineView plan={plan} />
          </div>
        )}
    </div>
  )
}
