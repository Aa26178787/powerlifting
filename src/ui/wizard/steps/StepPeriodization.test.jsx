// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepPeriodization from './StepPeriodization.jsx'
import { useProfileStore } from '../../store/profileStore.js'
beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })
describe('StepPeriodization', () => {
  it('sets the periodization model', async () => {
    render(<StepPeriodization />)
    await userEvent.setup().selectOptions(screen.getByLabelText(/주기화 모델/), 'block')
    expect(useProfileStore.getState().profile.periodizationModel).toBe('block')
  })
})
