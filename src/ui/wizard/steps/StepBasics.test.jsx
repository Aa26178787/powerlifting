// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepBasics from './StepBasics.jsx'
import { useProfileStore } from '../../store/profileStore.js'
import { LB_PER_KG } from '../../lib/units.js'

beforeEach(() => { useProfileStore.getState().reset(); localStorage.clear() })

describe('StepBasics units', () => {
  it('switches units to lbs', async () => {
    render(<StepBasics />)
    await userEvent.setup().selectOptions(screen.getByLabelText(/단위/), 'lbs')
    expect(useProfileStore.getState().profile.units).toBe('lbs')
  })
  it('bodyweight entered in lbs is stored as kg', () => {
    useProfileStore.getState().setUnits('lbs')
    render(<StepBasics />)
    fireEvent.change(screen.getByLabelText(/체중/), { target: { value: '220' } })
    const kg = useProfileStore.getState().profile.bodyweight
    expect(kg).toBeCloseTo(220 / LB_PER_KG, 2)   // ~99.8 kg
  })
})
