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
        { lift: 'squat', sets: 5, reps: [2, 5], repAnchor: 3, quality: 'strength', pct: 87, rpeTarget: 9, weight: 162.5, autoregulate: true },
      ], accessories: [{ name: 'leg press' }] },
    ] },
    { index: 4, isDeload: true, sessions: [
      { day: 1, exercises: [
        { lift: 'squat', sets: 3, reps: [2, 5], repAnchor: 3, quality: 'strength', pct: null, rpeTarget: 6, weight: 120, autoregulate: true },
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
  it('renders an exercise prescription line with weight', () => {
    render(<RoutineView plan={plan} />)
    expect(screen.getByText(/162\.5/)).toBeInTheDocument()
    expect(screen.getByText(/레그 프레스/)).toBeInTheDocument()
  })
  it('renders session notes when present', () => {
    render(<RoutineView plan={plan} />)
    expect(screen.getByText(/omitted/)).toBeInTheDocument()
  })
  it('renders rep range with en-dash', () => {
    render(<RoutineView plan={plan} />)
    expect(screen.getAllByText(/2–5/).length).toBeGreaterThan(0)
  })
  it('renders quality tag', () => {
    render(<RoutineView plan={plan} />)
    expect(screen.getAllByText(/근력/).length).toBeGreaterThan(0)
  })
})
