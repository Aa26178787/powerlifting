import React, { useState } from 'react'
import { useProfileStore, selectIsValid } from '../store/profileStore.js'
import { stepLabel } from '../i18n.js'
import StepBasics from './steps/StepBasics.jsx'
import StepLifts from './steps/StepLifts.jsx'
import StepExperience from './steps/StepExperience.jsx'
import StepGoals from './steps/StepGoals.jsx'

const BODY = { 1: StepBasics, 2: StepLifts, 3: StepExperience, 4: StepGoals }

export default function Wizard({ onComplete }) {
  const [step, setStep] = useState(1)
  const profile = useProfileStore((s) => s.profile)
  const last = 8
  const liftsValid = selectIsValid(profile)
  const canNext = step !== 2 || liftsValid

  return (
    <div className="wizard">
      <h2>{step}. {stepLabel(step)}</h2>
      <div className="wizard-body" data-step={step}>
        {(() => { const Body = BODY[step]; return Body ? <Body /> : <p className="wizard-step-stub">{stepLabel(step)}</p> })()}
      </div>
      <div className="wizard-nav">
        <button type="button" disabled={step === 1} onClick={() => setStep((n) => Math.max(1, n - 1))}>이전</button>
        {step < last
          ? <button type="button" disabled={!canNext} onClick={() => setStep((n) => Math.min(last, n + 1))}>다음</button>
          : <button type="button" onClick={onComplete}>루틴 생성</button>}
      </div>
    </div>
  )
}
