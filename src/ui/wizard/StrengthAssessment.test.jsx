// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StrengthAssessment from './StrengthAssessment.jsx'

describe('StrengthAssessment', () => {
  it('shows a placeholder when inputs incomplete', () => {
    render(<StrengthAssessment oneRMs={{ squat: 0, bench: 0, deadlift: 0 }} bodyweight={null} sex="M" />)
    expect(screen.getByText(/입력하면/)).toBeInTheDocument()
  })
  it('shows GL points and the weak lift when complete', () => {
    render(<StrengthAssessment oneRMs={{ squat: 200, bench: 120, deadlift: 240 }} bodyweight={90} sex="M" />)
    expect(screen.getByText(/GL 점수/)).toBeInTheDocument()
    expect(screen.getByText(/약점 종목/)).toBeInTheDocument()
  })

  it('shows 남성 기준 note when sex is empty string', () => {
    render(<StrengthAssessment oneRMs={{ squat: 200, bench: 120, deadlift: 240 }} bodyweight={90} sex="" />)
    expect(screen.getByText(/남성 기준 \(성별 미입력\)/)).toBeInTheDocument()
  })

  it('does not show sex note when sex is set', () => {
    render(<StrengthAssessment oneRMs={{ squat: 200, bench: 120, deadlift: 240 }} bodyweight={90} sex="M" />)
    expect(screen.queryByText(/성별 미입력/)).toBeNull()
  })
})
