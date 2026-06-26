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
  it('generates and displays a routine end to end via wizard', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Step 1 is shown first (기본) — click 다음 to go to step 2 (1RM)
    await user.click(screen.getByRole('button', { name: /다음/ }))

    // Step 2: enter 1RMs
    await user.type(screen.getByLabelText(/스쿼트 1RM/), '200')
    await user.type(screen.getByLabelText(/벤치프레스 1RM/), '140')
    await user.type(screen.getByLabelText(/데드리프트 1RM/), '240')

    // Advance through steps 3-7 (다음 × 6 more clicks to reach step 8)
    for (let i = 0; i < 6; i++) {
      await user.click(screen.getByRole('button', { name: /다음/ }))
    }

    // Step 8: click 루틴 생성
    await user.click(screen.getByRole('button', { name: /루틴 생성/ }))

    expect(screen.getByText(/프로그램:/)).toBeInTheDocument()
    expect(screen.getByText(/1주차/)).toBeInTheDocument()
  })

  it('shows the evidence-limits disclosure', () => {
    render(<App />)
    expect(screen.getByText(/근거.*한계.*꼭 읽어주세요/)).toBeInTheDocument()
  })

  it('shows 처음부터 button after routine generated; clears plan on click', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Navigate to step 2 and enter 1RMs
    await user.click(screen.getByRole('button', { name: /다음/ }))
    await user.type(screen.getByLabelText(/스쿼트 1RM/), '200')
    await user.type(screen.getByLabelText(/벤치프레스 1RM/), '140')
    await user.type(screen.getByLabelText(/데드리프트 1RM/), '240')

    // Advance through steps 3-7
    for (let i = 0; i < 6; i++) {
      await user.click(screen.getByRole('button', { name: /다음/ }))
    }
    await user.click(screen.getByRole('button', { name: /루틴 생성/ }))

    expect(screen.getByRole('button', { name: /처음부터/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /처음부터/ }))

    // Wizard should be back
    expect(screen.getByRole('button', { name: /다음/ })).toBeInTheDocument()
  })
})
