// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepPeriodization from './StepPeriodization.jsx'
import { useProfileStore } from '../../store/profileStore.js'
beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })
describe('StepPeriodization', () => {
  it('describes the adaptive hybrid (no textbook model picker)', () => {
    render(<StepPeriodization />)
    expect(screen.getByText(/하이브리드/)).toBeTruthy()
    expect(screen.queryByLabelText(/주기화 모델/)).toBeNull()
  })
  it('toggles competition mode', async () => {
    render(<StepPeriodization />)
    await userEvent.setup().click(screen.getByLabelText(/대회 모드/))
    expect(useProfileStore.getState().profile.competition.on).toBe(true)
  })
})
