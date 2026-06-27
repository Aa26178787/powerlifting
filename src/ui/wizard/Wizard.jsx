import React, { useState, useRef, useEffect } from 'react'
import { useProfileStore, selectIsValid } from '../store/profileStore.js'
import { stepLabel } from '../i18n.js'
import StepBasics from './steps/StepBasics.jsx'
import StepLifts from './steps/StepLifts.jsx'
import StepExperience from './steps/StepExperience.jsx'
import StepGoals from './steps/StepGoals.jsx'
import StepPeriodization from './steps/StepPeriodization.jsx'
import StepStyle from './steps/StepStyle.jsx'
import StepEquipment from './steps/StepEquipment.jsx'
import StepSummary from './steps/StepSummary.jsx'

const BODY = { 1: StepBasics, 2: StepLifts, 3: StepExperience, 4: StepGoals, 5: StepPeriodization, 6: StepStyle, 7: StepEquipment, 8: StepSummary }

export default function Wizard({ onComplete }) {
  const [step, setStep] = useState(1)
  const profile = useProfileStore((s) => s.profile)
  const last = 8
  const liftsValid = selectIsValid(profile)
  const canNext = step !== 2 || liftsValid
  const h2Ref = useRef(null)

  useEffect(() => {
    h2Ref.current?.focus()
  }, [step])

  return (
    <div className="wizard">
      <ol className="stepper" aria-live="polite">
        {Array.from({ length: last }, (_, i) => i + 1).map((n) => (
          <li key={n} className="stepper-item" aria-current={n === step ? 'step' : undefined}
              data-state={n < step ? 'done' : n === step ? 'current' : 'todo'}>
            <span className="stepper-dot">{n}</span>
            <span className="stepper-label">{stepLabel(n)}</span>
          </li>
        ))}
      </ol>
      <h2 ref={h2Ref} tabIndex={-1}>{step}. {stepLabel(step)}</h2>
      <div className="wizard-body" data-step={step}>
        {(() => { const Body = BODY[step]; return Body ? <Body /> : <p className="wizard-step-stub">{stepLabel(step)}</p> })()}
      </div>
      <div className="wizard-nav">
        <button type="button" className="btn btn-secondary" disabled={step === 1} onClick={() => setStep((n) => Math.max(1, n - 1))}>이전</button>
        {step < last
          ? <>
              <button
                type="button"
                className="btn"
                disabled={!canNext}
                aria-describedby={step === 2 && !liftsValid ? 'lifts-hint' : undefined}
                onClick={() => setStep((n) => Math.min(last, n + 1))}
              >다음</button>
              {step === 2 && !liftsValid && (
                <span id="lifts-hint" className="wizard-hint">세 종목의 1RM을 모두 입력해야 진행됩니다</span>
              )}
            </>
          : <button type="button" className="btn" onClick={onComplete}>루틴 생성</button>}
      </div>
    </div>
  )
}
