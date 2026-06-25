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

  it('toggles an excluded tool checkbox and updates excludedTools', async () => {
    render(<StepStyle />)
    // 밴드 = 'band' key — label text is '밴드'
    const checkboxes = screen.getAllByRole('checkbox')
    // tool checkboxes come after styles fieldset (no checkboxes there)
    // excludedTools fieldset is the first section with checkboxes
    const checkbox = checkboxes[0]
    await userEvent.setup().click(checkbox)
    const { excludedTools } = useProfileStore.getState().profile
    expect(excludedTools).toContain('band')
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
