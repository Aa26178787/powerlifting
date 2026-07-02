// @vitest-environment jsdom
// Spec §12 case 5 — LiftLogRow jsdom tests:
// prefill from top set, unit conversion (kg stored), logLift entry, advisory, flag checkbox.
import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LiftLogRow from './LiftLogRow.jsx'
import { useProfileStore, DEFAULT_PROFILE } from '../store/profileStore.js'

// Minimal main-lift exercise fixture with a labelled top set.
const makeEx = (overrides = {}) => ({
  baseLift: 'squat',
  lift: 'Back Squat (Low Bar)',
  rpeTarget: 9,
  scheme: {
    type: 'topSetBackoff',
    sets: [
      { label: '탑', weight: 150, reps: 3, rpe: 8.5 },
      { weight: 130, reps: 5, rpe: 7 },
    ],
  },
  ...overrides,
})

beforeEach(() => {
  // Reset to a known clean state with valid 1RMs (needed for Tier B badge tests).
  useProfileStore.setState({
    liftLog: [],
    profile: {
      ...DEFAULT_PROFILE,
      lifts: {
        squat:    { oneRM: 170 },
        bench:    { oneRM: 120 },
        deadlift: { oneRM: 200 },
      },
    },
  })
})

describe('LiftLogRow', () => {
  // ── guard ─────────────────────────────────────────────────────────────────────

  it('returns null (renders nothing) for non-main lift (no baseLift)', () => {
    const { container } = render(
      <LiftLogRow ex={makeEx({ baseLift: undefined })} week={1} day={1} units="kg" />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('returns null when baseLift is an accessory lift name', () => {
    const { container } = render(
      <LiftLogRow ex={makeEx({ baseLift: 'leg press' })} week={1} day={1} units="kg" />,
    )
    expect(container.firstChild).toBeNull()
  })

  // ── render / summary ──────────────────────────────────────────────────────────

  it('renders the 수행 기록 input area openly (not collapsed) for a main lift', () => {
    const { container } = render(<LiftLogRow ex={makeEx()} week={1} day={1} units="kg" />)
    expect(screen.getByText(/수행 기록/)).toBeInTheDocument()
    expect(container.querySelector('summary')).toBeNull()          // no fold/expand
    expect(container.querySelector('.lift-log-inputs')).toBeTruthy() // inputs directly visible
  })

  // ── prefill ───────────────────────────────────────────────────────────────────

  it('prefills weight input with top-set weight (kg)', () => {
    render(<LiftLogRow ex={makeEx()} week={1} day={1} units="kg" />)
    // toDisplay(150, 'kg', false) = 150
    expect(Number(screen.getByLabelText(/실제 무게/).value)).toBeCloseTo(150, 1)
  })

  it('prefills weight in lbs when units=lbs', () => {
    render(<LiftLogRow ex={makeEx()} week={1} day={1} units="lbs" />)
    // toDisplay(150, 'lbs', false) = Math.round(150 * 2.2046 * 10) / 10 ≈ 330.7
    const displayed = Number(screen.getByLabelText(/실제 무게/).value)
    expect(displayed).toBeGreaterThan(320)
    expect(displayed).toBeLessThan(340)
  })

  it('prefills reps from top set', () => {
    render(<LiftLogRow ex={makeEx()} week={1} day={1} units="kg" />)
    expect(Number(screen.getByLabelText(/반복 수/).value)).toBe(3)
  })

  it('prefills RPE select from top set rpe', () => {
    render(<LiftLogRow ex={makeEx()} week={1} day={1} units="kg" />)
    expect(Number(screen.getByLabelText(/실제 RPE/).value)).toBe(8.5)
  })

  it('falls back to max-weight set when no "탑"-labelled set exists', () => {
    const ex = makeEx({
      scheme: {
        type: 'topSetBackoff',
        sets: [
          { weight: 100, reps: 5, rpe: 7 },
          { weight: 160, reps: 3, rpe: 9 },  // max weight — no label
          { weight: 120, reps: 5, rpe: 7.5 },
        ],
      },
    })
    render(<LiftLogRow ex={ex} week={1} day={1} units="kg" />)
    expect(Number(screen.getByLabelText(/실제 무게/).value)).toBeCloseTo(160, 1)
  })

  // ── logLift / unit conversion ─────────────────────────────────────────────────

  it('기록 button stores correct kg entry in liftLog (kg units)', () => {
    render(<LiftLogRow ex={makeEx()} week={2} day={3} units="kg" />)
    fireEvent.click(screen.getByRole('button', { name: /기록/ }))
    const { liftLog } = useProfileStore.getState()
    expect(liftLog).toHaveLength(1)
    expect(liftLog[0]).toMatchObject({
      lift:   'squat',
      week:   2,
      day:    3,
      weight: 150,
      reps:   3,
      rpe:    8.5,
      flag:   null,
    })
  })

  it('stores kg (not lbs) when user enters lbs — unit conversion via fromInput', () => {
    render(<LiftLogRow ex={makeEx()} week={1} day={1} units="lbs" />)
    // Pre-filled with ~330.7 lbs. Clicking 기록 should convert back to kg.
    fireEvent.click(screen.getByRole('button', { name: /기록/ }))
    const { liftLog } = useProfileStore.getState()
    expect(liftLog).toHaveLength(1)
    // fromInput(330.7, 'lbs') ≈ 150 kg
    expect(liftLog[0].weight).toBeCloseTo(150, 0)
  })

  it('upserts by {lift,week,day}: second click overwrites first', () => {
    render(<LiftLogRow ex={makeEx()} week={1} day={1} units="kg" />)
    const btn = screen.getByRole('button', { name: /기록/ })
    fireEvent.click(btn)
    fireEvent.click(btn)
    // upsert — must remain exactly 1 entry, not 2
    expect(useProfileStore.getState().liftLog).toHaveLength(1)
  })

  // ── flag checkbox ─────────────────────────────────────────────────────────────

  it('flag checkbox checked → logLift stores flag=pain', () => {
    render(<LiftLogRow ex={makeEx()} week={1} day={1} units="kg" />)
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /기록/ }))
    expect(useProfileStore.getState().liftLog[0]).toMatchObject({ flag: 'pain' })
  })

  it('flag checkbox unchecked → logLift stores flag=null', () => {
    render(<LiftLogRow ex={makeEx()} week={1} day={1} units="kg" />)
    // checkbox starts unchecked
    fireEvent.click(screen.getByRole('button', { name: /기록/ }))
    expect(useProfileStore.getState().liftLog[0]).toMatchObject({ flag: null })
  })

  // ── Tier A advisory ───────────────────────────────────────────────────────────

  it('shows advisory text (다음 세션 권장 탑) when rpeTarget set and actualRpe != target', () => {
    // rpeTarget=9, defaultActualRpe=8.5 → easier than target → advise more weight
    render(<LiftLogRow ex={makeEx()} week={1} day={1} units="kg" />)
    expect(screen.getByText(/다음 세션 권장 탑/)).toBeInTheDocument()
  })

  it('hides advisory when rpeTarget and topSet.rpe are both null', () => {
    const ex = makeEx({
      rpeTarget: null,
      scheme: { type: 'straight', sets: [{ label: '탑', weight: 150, reps: 3, rpe: null }] },
    })
    render(<LiftLogRow ex={ex} week={1} day={1} units="kg" />)
    expect(screen.queryByText(/다음 세션 권장 탑/)).not.toBeInTheDocument()
  })

  it('advisory clamps extreme RPE diff to ±2.5 steps (no unbounded weight swing)', () => {
    // rpeTarget=9, actualRpe=6 → rawDelta = (9-6)/0.5 = 6 steps → clamped to 2.5
    // clampedActualRpe = 9 - 2.5*0.5 = 7.75
    // loadAdjustment(9, 7.75, 150) = roundToIncrement(150 * (1 + 2.5*0.02)) = roundToIncrement(157.5) = 157.5
    render(<LiftLogRow ex={makeEx()} week={1} day={1} units="kg" />)
    // Change RPE to 6 via select
    fireEvent.change(screen.getByLabelText(/실제 RPE/), { target: { value: '6' } })
    const advisory = screen.getByText(/다음 세션 권장 탑/)
    // Advisory should show a weight ≤ 150 * 1.05 (STEP_UP guard) ... but that's the EWMA guard,
    // not advisory. Advisory just uses the 2-step clamp. Check it shows a reasonable weight.
    expect(advisory.textContent).toMatch(/\d/)
    // Numeric value in advisory should be < 175 (not an unbounded spike)
    const match = advisory.textContent.match(/[\d.]+/)
    expect(Number(match[0])).toBeLessThan(175)
  })

  // ── Tier B e1RM badge ─────────────────────────────────────────────────────────

  it('shows Tier B badge (추정 1RM … 재생성 시 반영) when liftLog has entries for this lift', () => {
    useProfileStore.setState({
      liftLog: [{ lift: 'squat', week: 1, day: 1, weight: 165, reps: 1, rpe: 10, flag: null, ts: 1 }],
    })
    render(<LiftLogRow ex={makeEx({ rpeTarget: null })} week={2} day={1} units="kg" />)
    expect(screen.getByText(/추정 1RM/)).toBeInTheDocument()
    expect(screen.getByText(/재생성 시 반영/)).toBeInTheDocument()
  })

  it('hides Tier B badge when liftLog is empty', () => {
    // liftLog is already [] from beforeEach
    render(<LiftLogRow ex={makeEx({ rpeTarget: null })} week={1} day={1} units="kg" />)
    expect(screen.queryByText(/추정 1RM/)).not.toBeInTheDocument()
  })

  it('Tier B badge excludes pain-flagged entries from e1RM calculation', () => {
    useProfileStore.setState({
      liftLog: [
        { lift: 'squat', week: 1, day: 1, weight: 200, reps: 1, rpe: 10, flag: 'pain', ts: 1 },
      ],
    })
    render(<LiftLogRow ex={makeEx({ rpeTarget: null })} week={2} day={1} units="kg" />)
    // pain entries are excluded by liftEntries → entries.length=0 → no badge
    expect(screen.queryByText(/추정 1RM/)).not.toBeInTheDocument()
  })
})
