// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Wizard from './Wizard.jsx'
import { useProfileStore } from '../store/profileStore.js'

beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

describe('Wizard', () => {
  it('starts at step 1 and advances', async () => {
    render(<Wizard onComplete={() => {}} />)
    expect(screen.getByRole('heading', { name: /기본/ })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: /다음/ }))
    expect(screen.getByRole('heading', { name: /현재 1RM/ })).toBeInTheDocument()
  })
  it('renders a step indicator marking the current step', () => {
    render(<Wizard onComplete={() => {}} />)
    const current = document.querySelector('.stepper [aria-current="step"]')
    expect(current).toBeTruthy()
  })
  it('calls onComplete from the final step', async () => {
    // jump to step 8 by setting valid lifts then advancing
    const s = useProfileStore.getState()
    s.setLift('squat', { oneRM: 200 }); s.setLift('bench', { oneRM: 140 }); s.setLift('deadlift', { oneRM: 240 })
    let done = false
    render(<Wizard onComplete={() => { done = true }} />)
    const user = userEvent.setup()
    for (let i = 0; i < 7; i++) await user.click(screen.getByRole('button', { name: /다음|루틴 생성/ }))
    await user.click(screen.getByRole('button', { name: /루틴 생성/ }))
    expect(done).toBe(true)
  })
})
