// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepStyle from './StepStyle.jsx'
import { useProfileStore } from '../../store/profileStore.js'

beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

/** Returns the cause <select> paired with the given lift's position select.
 *  Strategy: find all comboboxes whose first option text is '—' or '자동(위치만)'
 *  (cause selects are identified by that placeholder). */
function getCauseSelects() {
  return screen.getAllByRole('combobox').filter((s) => {
    const first = s.options[0]
    return first && (first.text === '—' || first.text === '자동(위치만)')
  })
}

describe('StepStyle', () => {
  it('renders style and sticking point fieldsets', () => {
    render(<StepStyle />)
    expect(screen.getByText(/스타일/)).toBeTruthy()
    expect(screen.getByText(/스티킹포인트/)).toBeTruthy()
  })

  it('cause selects are rendered (one per lift) and disabled when position is none', () => {
    render(<StepStyle />)
    const causeSelects = getCauseSelects()
    // One cause select per lift (squat, bench, deadlift)
    expect(causeSelects).toHaveLength(3)
    // All disabled since default position is 'none' → no valid causes
    causeSelects.forEach((s) => expect(s).toBeDisabled())
  })

  it('cause select becomes enabled with correct options after selecting a position', async () => {
    render(<StepStyle />)
    const user = userEvent.setup()

    // Find all comboboxes; squat position select is the 5th (after 4 style selects)
    // We identify it by its option values (none/bottom/midrange/lockout)
    const positionSelects = screen.getAllByRole('combobox').filter((s) =>
      Array.from(s.options).some((o) => o.value === 'bottom')
    )
    // First position select is squat
    const squatPositionSelect = positionSelects[0]
    await user.selectOptions(squatPositionSelect, 'bottom')

    // After selecting 'bottom' for squat, cause select should be enabled with quads/hip options
    const causeSelects = getCauseSelects()
    const squatCauseSelect = causeSelects[0]
    expect(squatCauseSelect).not.toBeDisabled()
    const causeOptionValues = Array.from(squatCauseSelect.options).map((o) => o.value)
    expect(causeOptionValues).toContain('quads')
    expect(causeOptionValues).toContain('hip')
  })

  it('selecting a cause updates stickingCause in the store', async () => {
    render(<StepStyle />)
    const user = userEvent.setup()

    // Set squat position to lockout first
    const positionSelects = screen.getAllByRole('combobox').filter((s) =>
      Array.from(s.options).some((o) => o.value === 'lockout')
    )
    await user.selectOptions(positionSelects[0], 'lockout')

    // Now select 'hip' cause for squat
    const causeSelects = getCauseSelects()
    await user.selectOptions(causeSelects[0], 'hip')
    expect(useProfileStore.getState().profile.stickingCause.squat).toBe('hip')
  })

  it('changing position to one without the current cause resets it in the store', async () => {
    render(<StepStyle />)
    const user = userEvent.setup()

    const positionSelects = screen.getAllByRole('combobox').filter((s) =>
      Array.from(s.options).some((o) => o.value === 'bottom')
    )
    // Set bench to 'lockout' (valid: triceps)
    await user.selectOptions(positionSelects[1], 'lockout')
    const causeSelects = getCauseSelects()
    await user.selectOptions(causeSelects[1], 'triceps')
    expect(useProfileStore.getState().profile.stickingCause.bench).toBe('triceps')

    // Now change bench to 'bottom' (valid: chest, shoulder — triceps invalid)
    await user.selectOptions(positionSelects[1], 'bottom')
    expect(useProfileStore.getState().profile.stickingCause.bench).toBeNull()
  })

  it('toggles a variation-exclude checkbox and updates excludedExercises', async () => {
    render(<StepStyle />)
    // The only checkboxes are the per-variation 제외 boxes; pick the one for a known squat variation.
    const box = screen.getByRole('checkbox', { name: /Back Squat \(High Bar\)/ })
    await userEvent.setup().click(box)
    expect(useProfileStore.getState().profile.excludedExercises).toContain('Back Squat (High Bar)')
  })

  it('sets variationOverride.squat when a squat variation is selected', async () => {
    render(<StepStyle />)
    // The squat variation select is labelled by liftLabel('squat') = '스쿼트'
    const selects = screen.getAllByRole('combobox')
    // The variation selects come after the style selects; find one whose options include 'Back Squat (High Bar)'
    const variationSelect = selects.find((s) =>
      Array.from(s.options).some((o) => o.text === 'Back Squat (High Bar)')
    )
    expect(variationSelect).toBeTruthy()
    await userEvent.setup().selectOptions(variationSelect, 'Back Squat (High Bar)')
    expect(useProfileStore.getState().profile.variationOverride.squat).toBe('Back Squat (High Bar)')
  })
})
