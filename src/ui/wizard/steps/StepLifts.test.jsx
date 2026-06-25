// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepLifts from './StepLifts.jsx'
import { useProfileStore } from '../../store/profileStore.js'

beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

describe('StepLifts', () => {
  it('entering lifts + bodyweight shows assessment, and priority checkbox sets priorityLift', async () => {
    const s = useProfileStore.getState()
    s.setField('bodyweight', 90)
    s.setLift('squat', { oneRM: 200 }); s.setLift('bench', { oneRM: 110 }); s.setLift('deadlift', { oneRM: 250 })
    render(<StepLifts />)
    expect(screen.getByText(/GL 점수/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByLabelText(/우선 보강/))
    expect(useProfileStore.getState().profile.priorityLift).toBeTruthy()
  })
})
