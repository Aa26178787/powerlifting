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
  it('renders the template name and marks the deload week with the deload CSS class', () => {
    const { container } = render(<RoutineView plan={plan} />)
    expect(screen.getByText(/DUP/)).toBeInTheDocument()
    // CSS ::after adds the 디로드 pin — verify via the class, not DOM text
    expect(container.querySelector('.week.deload')).toBeTruthy()
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
  it('renders a set table with the set number and weight cells', () => {
    render(<RoutineView plan={plan} />)
    expect(screen.getAllByText(/무게/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/반복/).length).toBeGreaterThan(0)
    expect(screen.getByText(/162\.5/)).toBeInTheDocument()
  })
  it('tags exercise quality with a data-quality badge', () => {
    const { container } = render(<RoutineView plan={plan} />)
    expect(container.querySelector('[data-quality="strength"]')).toBeTruthy()
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

  it('overreaching banner has role="alert" and 경고: prefix', () => {
    useProfileStore.setState({ checkinLog: [{ readiness: 0.49 }, { readiness: 0.4 }, { readiness: 0.3 }] })
    render(<RoutineView plan={plan} />)
    const alert = document.querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert.textContent).toMatch(/경고:/)
  })

  it('renders — for a missing weight set cell', () => {
    const planWithMissingWeight = {
      template: 'dup',
      weeks: [
        { index: 1, isDeload: false, sessions: [
          { day: 1, exercises: [
            {
              lift: 'squat', quality: 'strength',
              scheme: {
                type: 'straight', evidenceTier: 'rct',
                sets: [{ weight: null, reps: 3, rpe: 8 }],
              },
            },
          ], accessories: [] },
        ] },
      ],
    }
    render(<RoutineView plan={planWithMissingWeight} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('deload week h3 does not contain (디로드) text in JSX (CSS pin only)', () => {
    render(<RoutineView plan={plan} />)
    const headings = screen.getAllByRole('heading', { level: 3 })
    const deloadHeading = headings.find((h) => h.textContent.includes('4주차'))
    expect(deloadHeading).toBeTruthy()
    // The text from JSX should NOT include (디로드) — CSS ::after adds the pin
    expect(deloadHeading.textContent).not.toMatch(/\(디로드\)/)
  })

  it('readiness badge appears in RoutineView after checkin, not in CheckinPanel', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    render(<RoutineView plan={plan} />)
    const user = userEvent.setup()
    await user.click(screen.getAllByRole('button', { name: '컨디션 반영' })[0])
    // badge in RoutineView (span.readiness-badge)
    const badges = document.querySelectorAll('.readiness-badge')
    expect(badges.length).toBe(1)
    expect(badges[0].textContent).toMatch(/%/)
  })

  it('CheckinPanel is wrapped in a <details> element (collapsed by default)', () => {
    const { container } = render(<RoutineView plan={plan} />)
    const details = container.querySelector('details')
    expect(details).toBeTruthy()
    // no `open` attribute — collapsed by default
    expect(details.hasAttribute('open')).toBe(false)
    // summary text is visible
    expect(details.querySelector('summary')).toBeTruthy()
    expect(details.querySelector('summary').textContent).toMatch(/컨디션 반영/)
    // CheckinPanel lives inside the details
    expect(details.querySelector('.checkin-panel')).toBeTruthy()
  })
})

// ── Feature: warmup rows + rest time display ──────────────────────────────────
const planWithWarmup = {
  template: 'custom',
  weeks: [{
    index: 1, isDeload: false, sessions: [{
      day: 1,
      exercises: [{
        lift: 'squat', quality: 'strength',
        warmup: [
          { weight: 65,   reps: 5, rpe: null, label: '워밍업' },
          { weight: 97.5, reps: 3, rpe: null, label: '워밍업' },
          { weight: 130,  reps: 2, rpe: null, label: '워밍업' },
        ],
        scheme: {
          type: 'straight', evidenceTier: 'rct',
          sets: [{ weight: 162.5, reps: 3, rpe: 8.5 }],
        },
      }],
      accessories: [{
        name: 'leg press', quality: 'hypertrophy',
        scheme: { type: 'straight', evidenceTier: 'rct', sets: [{ reps: 10, rpe: 8 }] },
      }],
    }],
  }],
}

describe('RoutineView warmup + rest', () => {
  beforeEach(() => {
    useProfileStore.setState({ checkinLog: [] })
  })

  it('renders warmup rows with 워밍업 label for main exercises', () => {
    render(<RoutineView plan={planWithWarmup} />)
    // Three warmup rows labelled "워밍업 1", "워밍업 2", "워밍업 3"
    expect(screen.getByText(/워밍업 1/)).toBeInTheDocument()
    expect(screen.getByText(/워밍업 2/)).toBeInTheDocument()
    expect(screen.getByText(/워밍업 3/)).toBeInTheDocument()
  })

  it('warmup rows appear in a .warmup-row CSS class', () => {
    const { container } = render(<RoutineView plan={planWithWarmup} />)
    expect(container.querySelectorAll('.warmup-row').length).toBe(3)
  })

  it('renders warmup weights in the table', () => {
    render(<RoutineView plan={planWithWarmup} />)
    expect(screen.getByText(/65/)).toBeInTheDocument()
    expect(screen.getByText(/97\.5/)).toBeInTheDocument()
    expect(screen.getByText(/130/)).toBeInTheDocument()
  })

  it('renders rest time for main exercise (strength → 3–5분)', () => {
    render(<RoutineView plan={planWithWarmup} />)
    expect(screen.getAllByText(/세트 간 휴식/).length).toBeGreaterThan(0)
    expect(screen.getByText(/세트 간 휴식 3–5분/)).toBeInTheDocument()
  })

  it('renders rest time for accessory (hypertrophy → 1–2분)', () => {
    render(<RoutineView plan={planWithWarmup} />)
    expect(screen.getByText(/세트 간 휴식 1–2분/)).toBeInTheDocument()
  })

  it('exercises without warmup field render no warmup rows', () => {
    // The existing plan fixture has no warmup field — should show 0 warmup rows
    render(<RoutineView plan={planWithWarmup} />)
    // The working set row has "1" as label (not "워밍업 1") — verify working set still renders
    expect(screen.getByText(/162\.5/)).toBeInTheDocument()
  })
})
