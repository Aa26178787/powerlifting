import React from 'react'
import { useProfileStore } from './ui/store/profileStore.js'
import { buildPlan } from './ui/lib/planAdapter.js'
import { planToCsv } from './ui/lib/exportCsv.js'
import InputForm from './ui/components/InputForm.jsx'
import RoutineView from './ui/components/RoutineView.jsx'
import LimitsPanel from './ui/components/LimitsPanel.jsx'

export default function App() {
  const profile = useProfileStore((s) => s.profile)
  const plan = useProfileStore((s) => s.plan)
  const setPlan = useProfileStore.setState

  const onGenerate = () => setPlan({ plan: buildPlan(profile) })

  const downloadCsv = () => {
    // Prepend a UTF-8 BOM so Excel renders the Korean columns correctly.
    const blob = new Blob(['﻿' + planToCsv(plan)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'routine.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app">
      <h1>파워리프팅 루틴 생성기</h1>
      <LimitsPanel />
      <div className="layout">
        <InputForm onGenerate={onGenerate} />
        <div>
          <div className="toolbar">
            <button type="button" disabled={!plan} onClick={downloadCsv}>CSV 다운로드</button>
            <button type="button" disabled={!plan} onClick={() => window.print()}>인쇄</button>
          </div>
          <RoutineView plan={plan} />
        </div>
      </div>
    </div>
  )
}
