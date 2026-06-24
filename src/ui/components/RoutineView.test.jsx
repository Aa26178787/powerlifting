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
        { lift: 'squat', sets: 5, reps: 5, pct: 81.1, rpeTarget: 8, weight: 162.5, velocity: null },
      ], accessories: ['leg press'] },
    ] },
    { index: 4, isDeload: true, sessions: [
      { day: 1, exercises: [
        { lift: 'squat', sets: 3, reps: 5, pct: null, rpeTarget: 6, weight: 120, velocity: null },
      ], accessories: [] },
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
  it('renders an exercise prescription line with weight', () => {
    render(<RoutineView plan={plan} />)
    expect(screen.getByText(/162\.5/)).toBeInTheDocument()
    expect(screen.getByText(/레그 프레스/)).toBeInTheDocument()
  })
})
