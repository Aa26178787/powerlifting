// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import RoutineView from './RoutineView.jsx'
import { useProfileStore } from '../store/profileStore.js'

const plan = {
  template: 'dup',
  weeks: [
    { index: 1, isDeload: false, sessions: [
      { day: 1, exercises: [
        {
          lift: 'squat', sets: 2, reps: [2, 5], repAnchor: 3, quality: 'strength',
          pct: 87, rpeTarget: 9, weight: 162.5, autoregulate: true,
          tempo: [3, 1, 1],
          scheme: {
            type: 'topSetBackoff',
            evidenceTier: 'consensus',
            sets: [
              { weight: 162.5, reps: 3, rpe: 9 },
              { weight: 142.5, reps: 5, rpe: 8 },
            ],
          },
        },
      ], accessories: [
        {
          name: 'leg press', quality: 'hypertrophy',
          scheme: { type: 'restPause', evidenceTier: 'rct', sets: [{ reps: '10+4+3', rpe: 9, note: '15-20s 후 재개' }] },
        },
      ] },
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
  beforeEach(() => {
    useProfileStore.setState({ checkinLog: [] })
  })

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
  it('renders accessory with its scheme + 체감 per-set line', () => {
    render(<RoutineView plan={plan} />)
    expect(screen.getByText(/레스트포즈/)).toBeInTheDocument()
    expect(screen.getByText(/체감/)).toBeInTheDocument()
  })
  it('renders a tempo spec (하강-정지-상승) when present', () => {
    render(<RoutineView plan={plan} />)
    expect(screen.getByText(/3-1-1초/)).toBeInTheDocument()
    expect(screen.getByText(/하강-정지-상승/)).toBeInTheDocument()
  })
  it('renders set reps in the per-set list', () => {
    render(<RoutineView plan={plan} />)
    // Multiple "1세트:" lines appear (one per exercise), use getAllByText
    expect(screen.getAllByText(/1세트:/).length).toBeGreaterThan(0)
  })
  it('renders a CheckinPanel control (컨디션 반영 button) per session', () => {
    render(<RoutineView plan={plan} />)
    expect(screen.getAllByText(/컨디션 반영/).length).toBeGreaterThan(0)
  })
  it('shows overreaching banner when checkinLog triggers detectOverreaching', () => {
    useProfileStore.setState({ checkinLog: [{ readiness: 0.49 }, { readiness: 0.4 }, { readiness: 0.3 }] })
    render(<RoutineView plan={plan} />)
    expect(screen.getAllByText(/과피로|디로드/).length).toBeGreaterThan(0)
  })
})
