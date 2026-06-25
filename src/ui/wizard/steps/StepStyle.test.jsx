// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepStyle from './StepStyle.jsx'
import { useProfileStore } from '../../store/profileStore.js'

beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

describe('StepStyle', () => {
  it('renders style and sticking point fieldsets', () => {
    render(<StepStyle />)
    expect(screen.getByText(/스타일/)).toBeTruthy()
    expect(screen.getByText(/스티킹포인트/)).toBeTruthy()
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
