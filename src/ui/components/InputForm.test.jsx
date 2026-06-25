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
    const btn = screen.getByRole('button', { name: /루틴 생성/ })
    expect(btn).toBeDisabled()

    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/스쿼트 1RM/), '200')
    await user.type(screen.getByLabelText(/벤치프레스 1RM/), '140')
    await user.type(screen.getByLabelText(/데드리프트 1RM/), '240')
    expect(btn).toBeEnabled()
  })

  it('calls onGenerate when Generate is clicked with a valid profile', async () => {
    let called = false
    useProfileStore.getState().setLift('squat', { oneRM: 200 })
    useProfileStore.getState().setLift('bench', { oneRM: 140 })
    useProfileStore.getState().setLift('deadlift', { oneRM: 240 })
    render(<InputForm onGenerate={() => { called = true }} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /루틴 생성/ }))
    expect(called).toBe(true)
  })

  it('updates deadlift stance style in the store', async () => {
    render(<InputForm onGenerate={() => {}} />)
    await userEvent.setup().selectOptions(screen.getByLabelText(/데드리프트 스탠스/), 'sumo')
    expect(useProfileStore.getState().profile.style.deadlift.stance).toBe('sumo')
  })
  it('updates a region status in the store', async () => {
    render(<InputForm onGenerate={() => {}} />)
    await userEvent.setup().selectOptions(screen.getByLabelText(/허리 상태/), '2')
    expect(useProfileStore.getState().profile.regionStatus.lowerBack).toBe(2)
  })
})
