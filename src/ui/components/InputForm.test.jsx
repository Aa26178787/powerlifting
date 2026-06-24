// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InputForm from './InputForm.jsx'
import { useProfileStore } from '../store/profileStore.js'

beforeEach(() => {
  useProfileStore.getState().reset()
  localStorage.clear()
})

describe('InputForm', () => {
  it('disables Generate until all three lifts are entered', async () => {
    render(<InputForm onGenerate={() => {}} />)
    const btn = screen.getByRole('button', { name: /generate/i })
    expect(btn).toBeDisabled()

    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/squat 1rm/i), '200')
    await user.type(screen.getByLabelText(/bench 1rm/i), '140')
    await user.type(screen.getByLabelText(/deadlift 1rm/i), '240')
    expect(btn).toBeEnabled()
  })

  it('calls onGenerate when Generate is clicked with a valid profile', async () => {
    let called = false
    useProfileStore.getState().setLift('squat', { oneRM: 200 })
    useProfileStore.getState().setLift('bench', { oneRM: 140 })
    useProfileStore.getState().setLift('deadlift', { oneRM: 240 })
    render(<InputForm onGenerate={() => { called = true }} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /generate/i }))
    expect(called).toBe(true)
  })

  it('updates days per week in the store', async () => {
    render(<InputForm onGenerate={() => {}} />)
    await userEvent.setup().selectOptions(screen.getByLabelText(/days per week/i), '5')
    expect(useProfileStore.getState().profile.daysPerWeek).toBe(5)
  })
})
