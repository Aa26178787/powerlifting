import React, { useState } from 'react'
import { useProfileStore, selectIsValid } from '../store/profileStore.js'
import { stepLabel } from '../i18n.js'

export default function Wizard({ onComplete }) {
  const [step, setStep] = useState(1)
  const profile = useProfileStore((s) => s.profile)
  const last = 8
  const liftsValid = selectIsValid(profile)
  const canNext = step !== 2 || liftsValid

  const stepStubs = {
    1: '기본', 2: '현재 1RM', 3: '경력', 4: '목표', 5: '주기화', 6: '스타일·약점', 7: '장비·일정', 8: '요약'
  }

  return (
    <div className="wizard">
      <h2>{step}. {stepLabel(step)}</h2>
      <div className="wizard-body" data-step={step}>
        {/* Step bodies are added in Tasks 9-10; minimal stub keeps navigation testable */}
        <p className="wizard-step-stub">Step {step} content</p>
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
