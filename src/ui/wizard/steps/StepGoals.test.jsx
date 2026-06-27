// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepGoals from './StepGoals.jsx'
import { useProfileStore } from '../../store/profileStore.js'

beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

describe('StepGoals', () => {
  it('applies the recommended blend', async () => {
    useProfileStore.getState().setField('years', 0.5) // beginner -> strength 0.6
    render(<StepGoals />)
    await userEvent.setup().click(screen.getByRole('button', { name: /추천 적용/ }))
    expect(useProfileStore.getState().profile.qualities.strength).toBe(0.6)
  })

  it('shows normalization notice near sliders', () => {
    render(<StepGoals />)
    expect(screen.getByText(/상대 비중으로 자동 정규화됩니다/)).toBeInTheDocument()
  })
})
