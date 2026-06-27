// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
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
  it('sets mesoWeeks to 6 via number input after blur', () => {
    render(<StepPeriodization />)
    const input = screen.getByLabelText(/운동 주차/)
    fireEvent.change(input, { target: { value: '6' } })
    // store not yet updated before blur
    fireEvent.blur(input, { target: { value: '6' } })
    expect(useProfileStore.getState().profile.mesoWeeks).toBe(6)
  })

  it('does not clamp mesoWeeks raw value during typing (stores raw "2" before blur)', () => {
    render(<StepPeriodization />)
    const input = screen.getByLabelText(/운동 주차/)
    fireEvent.change(input, { target: { value: '2' } })
    // raw value displayed, store not yet clamped
    expect(input.value).toBe('2')
    expect(useProfileStore.getState().profile.mesoWeeks).not.toBe(2)
  })

  it('clamps mesoWeeks below 3 to 3 on blur', () => {
    render(<StepPeriodization />)
    const input = screen.getByLabelText(/운동 주차/)
    fireEvent.change(input, { target: { value: '1' } })
    fireEvent.blur(input, { target: { value: '1' } })
    expect(useProfileStore.getState().profile.mesoWeeks).toBe(3)
  })
  it('toggles deloadEnabled to false when unchecked', async () => {
    render(<StepPeriodization />)
    // default is true, so clicking unchecks it
    await userEvent.setup().click(screen.getByLabelText(/디로드 포함/))
    expect(useProfileStore.getState().profile.deloadEnabled).toBe(false)
  })
})
