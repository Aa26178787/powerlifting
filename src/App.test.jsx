// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { useProfileStore } from './ui/store/profileStore.js'

beforeEach(() => {
  useProfileStore.getState().reset()
  localStorage.clear()
})

describe('App', () => {
  it('generates and displays a routine end to end', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText(/squat 1rm/i), '200')
    await user.type(screen.getByLabelText(/bench 1rm/i), '140')
    await user.type(screen.getByLabelText(/deadlift 1rm/i), '240')
    await user.click(screen.getByRole('button', { name: /generate routine/i }))
    expect(screen.getByText(/Template:/i)).toBeInTheDocument()
    expect(screen.getByText(/Week 1/i)).toBeInTheDocument()
  })

  it('shows the evidence-limits disclosure', () => {
    render(<App />)
    expect(screen.getByText(/evidence.*limits/i)).toBeInTheDocument()
  })
})
