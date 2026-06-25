// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RoutineView from './RoutineView.jsx'

const plan = {
  template: 'dup',
  weeks: [
    { index: 1, isDeload: false, sessions: [
      { day: 1, exercises: [
        {
          lift: 'squat', sets: 2, reps: [2, 5], repAnchor: 3, quality: 'strength',
          pct: 87, rpeTarget: 9, weight: 162.5, autoregulate: true,
          scheme: {
            type: 'topSetBackoff',
            evidenceTier: 'consensus',
            sets: [
              { weight: 162.5, reps: 3, rpe: 9 },
              { weight: 142.5, reps: 5, rpe: 8 },
            ],
          },
        },
      ], accessories: [{ name: 'leg press' }] },
    ] },
    { index: 4, isDeload: true, sessions: [
      { day: 1, exercises: [
        {
          lift: 'squat', sets: 1, reps: [2, 5], repAnchor: 3, quality: 'strength',
          pct: null, rpeTarget: 6, weight: 120, autoregulate: true,
          scheme: {
            type: 'straight',
            evidenceTier: 'rct',
            sets: [
              { weight: 120, reps: 3, rpe: 6 },
            ],
          },
        },
      ], accessories: [], notes: ['deadlift omitted this week due to severe lowerBack status'] },
    ] },
  ],
}

describe('RoutineView', () => {
  it('shows a placeholder when no plan', () => {
    render(<RoutineView plan={null} />)
    expect(screen.getByText(/아직 루틴이 없습니다/)).toBeInTheDocument()
  })
  it('renders the template name and a deload badge', () => {
    render(<RoutineView plan={plan} />)
    expect(screen.getByText(/DUP/)).toBeInTheDocument()
    expect(screen.getByText(/디로드/)).toBeInTheDocument()
  })
  it('renders per-set weight in exercise list', () => {
    render(<RoutineView plan={plan} />)
    expect(screen.getByText(/162\.5/)).toBeInTheDocument()
    expect(screen.getByText(/레그 프레스/)).toBeInTheDocument()
  })
  it('renders session notes when present', () => {
    render(<RoutineView plan={plan} />)
    expect(screen.getByText(/omitted/)).toBeInTheDocument()
  })
  it('renders scheme label (탑세트+백오프 and 스트레이트)', () => {
    render(<RoutineView plan={plan} />)
    expect(screen.getAllByText(/탑세트/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/스트레이트/).length).toBeGreaterThan(0)
  })
  it('renders quality tag', () => {
    render(<RoutineView plan={plan} />)
    expect(screen.getAllByText(/근력/).length).toBeGreaterThan(0)
  })
  it('renders set reps in the per-set list', () => {
    render(<RoutineView plan={plan} />)
    // Multiple "1세트:" lines appear (one per exercise), use getAllByText
    expect(screen.getAllByText(/1세트:/).length).toBeGreaterThan(0)
  })
})
